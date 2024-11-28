import {
  Action,
  ActionPanel,
  closeMainWindow,
  confirmAlert,
  getFrontmostApplication,
  Icon,
  List,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useState } from "react";
import { exec } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { runAppleScript } from "run-applescript";
import fs from "fs";
import os from "os";
import path from "path";

const baseDir = path.join(os.homedir(), "Library", "Application Support", "JetBrains");

const getRecentProjectsFilePath = (): string => {
  const pyCharmDir = fs
    .readdirSync(baseDir)
    .filter((dir) => dir.startsWith("PyCharm") && /^\d{4}\.\d+$/.test(dir.slice(7)))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];

  if (!pyCharmDir) throw new Error("No PyCharm directories found.");

  const filePath = path.join(baseDir, pyCharmDir, "options", "recentProjects.xml");
  if (!fs.existsSync(filePath)) throw new Error(`recentProjects.xml not found in ${pyCharmDir}.`);

  return filePath;
};

const recentProjectsFilePath = getRecentProjectsFilePath();

const parser = new XMLParser({ ignoreAttributes: false });

//noinspection JSUnusedGlobalSymbols
export default function Command() {
  const { state, search } = useSearch();
  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search recent projects...">
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.name} searchResult={searchResult} search={search} state={state} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  search,
  state,
}: {
  searchResult: SearchResult;
  search: (searchText: string) => Promise<void>;
  state: SearchState;
}) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.path}
      actions={
        <ActionPanel>
          <Action
            title="Open project"
            icon={{ fileIcon: "/Applications/PyCharm.app" }}
            onAction={async () => {
              await closeMainWindow();
              await popToRoot();
              exec(`/Applications/PyCharm.app/Contents/MacOS/pycharm ${searchResult.path}`);
            }}
          />
          <Action
            title="Open project directory in terminal"
            icon={Icon.Terminal}
            onAction={async () => {
              await closeMainWindow();
              await popToRoot();
              await openInITerm2(searchResult.path);
            }}
          />
          <Action
            title="Remove project from history"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              if (await confirmAlert({ title: "PyCharm will be restarted! Are you sure?" })) {
                if (await deleteRecord(searchResult)) {
                  await showToast({
                    title: "Success",
                    message: `Project ${searchResult.name} has been removed from history`,
                  });
                  await search(state.term);
                }
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [] as SearchResult[], isLoading: false, term: "" });

  const search = useCallback(
    async function search(searchText: string) {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
        term: searchText,
      }));

      try {
        const results = await performSearch(searchText);
        setState((oldState) => ({
          ...oldState,
          results: results,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        console.error("search error", error);

        if ((error as Error).message?.includes("no such file")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not perform search",
            message: "Path to recent projects XML not found",
          });
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
        }
      }
    },
    [setState],
  );

  return { state, search };
}

async function deleteRecord(searchResult: SearchResult): Promise<boolean> {
  const content = parser.parse(
    await readFile(recentProjectsFilePath, {
      flag: "r",
    }),
  );
  const projectPathKey = searchResult.path.replace(process.env.HOME || "~", "$USER_HOME$");
  const additionalInfoIndex = content.application.component.option.findIndex((option: NameValueData) => {
    return option["@_name"] === "additionalInfo";
  });
  content.application.component.option[additionalInfoIndex].map.entry = content.application.component.option[
    additionalInfoIndex
  ].map.entry.filter((project: Project) => {
    return project["@_key"] !== projectPathKey;
  });

  const xmlWriteOptions = {
    format: true,
    ignoreAttributes: false,
    suppressBooleanAttributes: false,
    suppressUnpairedNode: false,
    unpairedTags: ["option", "frame"],
  };
  const builder = new XMLBuilder(xmlWriteOptions);
  const xmlContent = builder.build(content);
  const isPyCharmWasOpen = await isPyCharmRunning();
  const frontmostApp = await getFrontmostApplication();
  const isPyCharmWasInForeground = frontmostApp.name === "PyCharm";
  if (isPyCharmWasOpen) {
    exec(`osascript -e 'quit app "/Applications/PyCharm.app"'`);
  }
  await writeFile(recentProjectsFilePath, xmlContent, { flag: "w" });
  if (isPyCharmWasOpen) {
    if (isPyCharmWasInForeground) {
      // Ugly workaround for Raycast window disappearing when closing PyCharm if it was frontmost
      exec("sleep 2 && open -a /Applications/PyCharm.app/Contents/MacOS/pycharm");
      setTimeout(() => {
        open("raycast://");
      }, 4000);
    } else {
      exec("sleep 3 && open -g -a /Applications/PyCharm.app/Contents/MacOS/pycharm");
    }
  }
  return true;
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  const searchLower = searchText.toLocaleLowerCase();
  const content = parser.parse(
    await readFile(recentProjectsFilePath, {
      flag: "r",
    }),
  );
  const application = content.application;
  let options =
    application.component && application.component["@_name"] === "RecentProjectsManager"
      ? application.component.option
      : [];
  if (!Array.isArray(options)) {
    // if there are no project groups defined,
    // there is only one entry in 2020.3+, so we change it into array
    options = [options];
  }
  const entries = options.find((option: NameValueData) => {
    return option["@_name"] === "additionalInfo";
  });
  const projectPaths: SearchResult[] = [];
  entries.map.entry.forEach((project: Project) => {
    if (project["@_key"]) {
      const path = project["@_key"].replace("$USER_HOME$", process.env.HOME || "~");
      const name = path.split("/").at(-1) || "(unknown)";
      let openTimeStamp = "";
      project.value.RecentProjectMetaInfo.option.forEach((option) => {
        if (option["@_name"] === "projectOpenTimestamp") {
          openTimeStamp = option["@_value"];
        }
      });
      projectPaths.push({ name: name, path: path, lastOpen: openTimeStamp });
    }
  });
  return projectPaths
    .sort((prj1, prj2) => {
      return prj1.lastOpen < prj2.lastOpen ? 1 : -1;
    })
    .filter((project) => project.name.toLocaleLowerCase().includes(searchLower));
}

async function isPyCharmRunning(): Promise<boolean> {
  const script = `
    tell application "System Events"
      return (name of processes) contains "PyCharm"
    end tell
  `;
  const result = await runAppleScript(script);
  return result.trim() === "true";
}

async function openInITerm2(path: string) {
  const script = `
      tell application "System Events"
      -- some versions might identify as "iTerm2" instead of "iTerm"
      set isRunning to (exists (processes where name is "iTerm")) or (exists (processes where name is "iTerm2"))
      end tell

      tell application "iTerm"
      activate
      set hasNoWindows to ((count of windows) is 0)
      if isRunning and hasNoWindows then
          create window with default profile
      end if
      select first window

      tell the first window
          if isRunning and hasNoWindows is false then
          create tab with default profile
          end if
          set command to " cd ${path}"
          tell current session to write text command
          end tell
      end tell
  `;
  await runAppleScript(script);
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  term: string;
}

interface SearchResult {
  name: string;
  path: string;
  lastOpen: string;
}

interface Project {
  "@_key": string;
  value: {
    RecentProjectMetaInfo: {
      option: [NameValueData];
    };
  };
  frame: FrameData;
  "@_frameTitle": string;
  "@_opened": string;
  "@_projectWorkspaceId": string;
}

interface NameValueData {
  "@_name": string;
  "@_value": string;
}

interface FrameData {
  "@_x": string;
  "@_y": string;
  "@_width": string;
  "@_height": string;
  "@_extendedState": string;
}

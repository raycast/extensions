import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import degit from "degit";
import fs, { existsSync, readdirSync } from "fs";
import { rm } from "fs/promises";
import { globby } from "globby";
import { parse, resolve } from "path";
import { useEffect, useState } from "react";

const CACHE_DIR = resolve(environment.supportPath, "pages");

async function refreshPages() {
  await rm(resolve(CACHE_DIR), { recursive: true, force: true });
  await showToast(Toast.Style.Animated, "Fetching TLDR Pages...");
  try {
    await degit("tldr-pages/tldr/pages").clone(CACHE_DIR);
    await showToast(Toast.Style.Success, "TLDR pages fetched!");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download Failed!", "Please check your internet connexion.");
  }
}

async function readPages() {
  const platformNames = ["osx", "common", "linux", "windows", "sunos", "android"];
  return await Promise.all(
    platformNames.map(async (platformName) => {
      const filepaths = await globby(`${CACHE_DIR}/${platformName}/*`);
      const pages = await Promise.all(filepaths.map((filepath) => parsePage(filepath)));
      return {
        name: platformName,
        pages: pages,
      };
    })
  );
}

export default function TLDRList(): JSX.Element {
  const [platforms, setPlatforms] = useState<Record<string, Platform>>();
  const [selectedPlatformName, setSelectedPlatformName] = useState<string>("osx");

  const selectedPlatforms = platforms ? [platforms[selectedPlatformName], platforms["common"]] : undefined;

  async function loadPages(options?: { forceRefresh?: boolean }) {
    if (!existsSync(CACHE_DIR) || readdirSync(CACHE_DIR).length === 0 || options?.forceRefresh) {
      await refreshPages();
    }
    const platforms = await readPages();
    setPlatforms(Object.fromEntries(platforms.map((platform) => [platform.name, platform])));
  }

  useEffect(() => {
    loadPages();
  }, []);

  return (
    <List
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Platform" storeValue onChange={setSelectedPlatformName}>
          <List.Dropdown.Section>
            {["osx", "linux", "windows", "sunos", "android"].map((platform) => (
              <List.Dropdown.Item title={platform} value={platform} key={platform} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isLoading={!platforms}
    >
      {selectedPlatforms?.map((platform) => (
        <List.Section title={platform.name} key={platform.name}>
          {platform.pages
            .sort((a, b) => a.command.localeCompare(b.command))
            .map((page) => (
              <List.Item
                title={page.command}
                detail={<List.Item.Detail markdown={page.markdown} />}
                key={page.filename}
                actions={
                  <ActionPanel>
                    <Action.Push title="Browse Examples" icon={Icon.ArrowRight} target={<CommandList page={page} />} />
                    <OpenCommandWebsiteAction page={page} />
                    <Action
                      title="Refresh Pages"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={async () => {
                        await loadPages({ forceRefresh: true });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function OpenCommandWebsiteAction(props: { page: Page }) {
  const page = props.page;
  return page.url ? <Action.OpenInBrowser title="Open Command Website" url={page.url} /> : null;
}

function CommandList(props: { page: Page }) {
  const page = props.page;
  return (
    <List navigationTitle={page.command}>
      {page.items?.map((item) => (
        <List.Section key={item.description} title={item.description}>
          <List.Item
            title={item.command}
            key={item.command}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={item.command}
                  onCopy={async () => {
                    await closeMainWindow();
                    await popToRoot();
                  }}
                />
                <OpenCommandWebsiteAction page={page} />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}

interface Platform {
  name: string;
  pages: Page[];
}

interface Page {
  command: string;
  filename: string;
  subtitle: string;
  markdown: string;
  url?: string;
  items: { description: string; command: string }[];
}

async function parsePage(path: string): Promise<Page> {
  const markdown = await fs.promises.readFile(path).then((buffer) => buffer.toString());

  const subtitle = [];
  const commands = [];
  const descriptions = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    if (line.startsWith(">")) subtitle.push(line.slice(2));
    else if (line.startsWith("`")) commands.push(line.slice(1, -1));
    else if (line.startsWith("-")) descriptions.push(line.slice(2));
  }

  const match = markdown.match(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/
  );
  const url = match ? match[0] : undefined;

  return {
    command: lines[0].slice(2),
    filename: parse(path).name,
    subtitle: subtitle[0],
    markdown: markdown,
    url,
    items: zip(commands, descriptions).map(([command, description]) => ({
      command: command as string,
      description: description as string,
    })),
  };
}

function zip(arr1: string[], arr2: string[]) {
  return arr1.map((value, index) => [value, arr2[index]]);
}

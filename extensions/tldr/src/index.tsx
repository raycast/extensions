import {
  ActionPanel,
  closeMainWindow,
  CopyToClipboardAction,
  Detail,
  environment,
  Icon,
  List,
  popToRoot,
  PushAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import degit from "degit";
import fs, { existsSync } from "fs";
import { rm } from "fs/promises";
import { globby } from "globby";
import { parse, resolve } from "path";
import { useEffect, useState } from "react";

const CACHE_DIR = resolve(environment.supportPath, "pages");

async function refreshPages() {
  await rm(resolve(CACHE_DIR), { recursive: true, force: true });
  await showToast(ToastStyle.Animated, "Fetching TLDR Pages...");
  try {
    await degit("tldr-pages/tldr/pages").clone(CACHE_DIR);
    await showToast(ToastStyle.Success, "TLDR pages fetched!");
  } catch (error) {
    await showToast(ToastStyle.Failure, "Download Failed!", "Please check your internet connexion.");
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
  const [platforms, setPlatforms] = useState<Platform[]>();
  const [query, setQuery] = useState("");
  useEffect(() => {
    async function loadPages() {
      if (!existsSync(CACHE_DIR)) {
        await refreshPages();
      }

      setPlatforms(await readPages());
    }
    loadPages();
  }, []);

  return (
    <List
      searchBarPlaceholder="Search for command..."
      onSearchTextChange={(query) => {
        setQuery(query);
      }}
      isLoading={!platforms}
    >
      {platforms?.map((platform) => (
        <List.Section title={platform.name} key={platform.name}>
          {platform.pages
            .filter((page) => page.title.startsWith(query))
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((page) => (
              <List.Item
                title={page.title}
                key={page.filename}
                subtitle={page.subtitle}
                accessoryTitle={page.filename}
                actions={
                  <ActionPanel>
                    <PushAction title="Show Commands" icon={Icon.ArrowRight} target={<CommandList page={page} />} />
                    <PushAction title="Show Detail" icon={Icon.Text} target={<Detail markdown={page.markdown} />} />
                    <ActionPanel.Item
                      title="Refresh Pages"
                      icon={Icon.ArrowClockwise}
                      onAction={async () => {
                        await refreshPages();
                        setPlatforms(await readPages());
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

function CommandList(props: { page: Page }) {
  const page = props.page;
  return (
    <List navigationTitle={page.title}>
      {page.items?.map((item) => (
        <List.Section key={item.description} title={item.description}>
          <List.Item
            title={item.command}
            key={item.command}
            actions={
              <ActionPanel>
                <CopyToClipboardAction
                  content={item.command}
                  onCopy={async () => {
                    await closeMainWindow();
                    await popToRoot();
                  }}
                />
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
  title: string;
  filename: string;
  subtitle: string;
  markdown: string;
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

  return {
    title: lines[0].slice(2),
    filename: parse(path).name,
    subtitle: subtitle[0],
    markdown: markdown,
    items: zip(commands, descriptions).map(([command, description]) => ({
      command: command as string,
      description: description as string,
    })),
  };
}

function zip(arr1: string[], arr2: string[]) {
  return arr1.map((value, index) => [value, arr2[index]]);
}

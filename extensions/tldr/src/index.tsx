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
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import fs, { existsSync, readdirSync } from "fs";
import { rm } from "fs/promises";
import { globby } from "globby";
import https from "https";
import { parse, resolve } from "path";
import { promisify } from "util";
import { JSX, useEffect, useState } from "react";

const execAsync = promisify(exec);

const CACHE_DIR = resolve(environment.supportPath, "pages");

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);

        file.on("finish", () => {
          file.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        file.on("error", (err) => {
          file.close();
          fs.unlink(dest, () => reject(err));
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function refreshPages() {
  await rm(resolve(CACHE_DIR), { recursive: true, force: true });
  await showToast(Toast.Style.Animated, "Fetching TLDR Pages...");

  const ZIP_URL = "https://github.com/tldr-pages/tldr/archive/refs/heads/main.zip";
  const tempZipPath = resolve(environment.supportPath, "tldr-main.zip");
  const tempExtractPath = resolve(environment.supportPath, "tldr-temp");

  try {
    await downloadFile(ZIP_URL, tempZipPath);

    if (!existsSync(tempZipPath)) {
      throw new Error("Downloaded file does not exist");
    }

    const stats = await fs.promises.stat(tempZipPath);
    if (stats.size === 0) {
      throw new Error("Downloaded file is empty");
    }

    await fs.promises.mkdir(tempExtractPath, { recursive: true });
    try {
      await execAsync(`unzip -q "${tempZipPath}" -d "${tempExtractPath}"`);
    } catch {
      throw new Error("Failed to extract archive: unzip command failed. Please ensure unzip is installed.");
    }

    const pagesPath = resolve(tempExtractPath, "tldr-main", "pages");
    await fs.promises.rename(pagesPath, CACHE_DIR);
    await showToast(Toast.Style.Success, "TLDR pages fetched!");
  } catch (error) {
    await showFailureToast(error, { title: "Download Failed" });
  } finally {
    await rm(tempZipPath, { force: true });
    await rm(tempExtractPath, { recursive: true, force: true });
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
    }),
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
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/,
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

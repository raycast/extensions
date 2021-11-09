import { ActionPanel, CopyToClipboardAction, Detail, environment, Icon, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import degit from "degit";
import fs, { readdirSync } from "fs";
import { globby } from "globby";
import { parse } from "path";
import { useEffect, useState } from "react";

export default function TLDRList(): JSX.Element {
  const [platforms, setPlatforms] = useState<Platform[]>();
  useEffect(() => {
    async function fetchPages() {
      if (readdirSync(environment.supportPath).length == 0) {
        const toast = await showToast(ToastStyle.Animated, "Pulling TLDR Pages");
        await degit("tldr-pages/tldr/pages").clone(environment.supportPath);
        toast.hide();
      }

      const platformNames = ["osx", "common", "linux", "windows", "sunos", "android"];
      const platforms = await Promise.all(
        platformNames.map(async (platformName) => {
          const filepaths = await globby(`${environment.supportPath}/${platformName}/*`);
          const pages = await Promise.all(
            filepaths.map((filepath) => parsePage(filepath))
          );
          return {
            name: platformName,
            pages: pages,
          };
        })
      );
      setPlatforms(platforms);
    }
    fetchPages();
  }, []);

  return (
    <List searchBarPlaceholder="Input command" throttle={true} isLoading={!platforms}>
      {platforms?.map((platform) => (
        <List.Section title={platform.name} key={platform.name}>
          {platform.pages.map((page) => (
            <List.Item
              title={page.name}
              key={page.filename}
              subtitle={page.description}
              accessoryTitle={page.filename}
              actions={
                <ActionPanel>
                  <PushAction title="Show Commands" icon={Icon.ArrowRight} target={<CommandList page={page} />} />
                  <PushAction title="Show Markdown" icon={Icon.Text} target={<Detail markdown={page.markdown} />} />
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
    <List navigationTitle={page.name}>
      {page.items?.map((item) => (
        <List.Section key={item.description} title={item.description}>
          <List.Item
            title={item.command}
            key={item.command}
            actions={
              <ActionPanel>
                <CopyToClipboardAction content={item.command} />
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
  name: string;
  filename: string;
  description: string;
  markdown: string;
  items: { description: string; command: string }[];
}

async function parsePage(path: string): Promise<Page> {
  const markdown = await fs.promises.readFile(path).then(buffer => buffer.toString())
  const lines = markdown.split("\n");
  const name = lines[0].slice(2);
  const description = lines.filter((line) => line.startsWith(">")).map((line) => line.slice(2))[0];
  const commands = lines.filter((line) => line.startsWith("`")).map((line) => line.slice(1, -1));
  const descriptions = lines.filter((line) => line.startsWith("-")).map((line) => line.slice(2));

  return {
    name: name,
    filename: parse(path).name,
    description: description,
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

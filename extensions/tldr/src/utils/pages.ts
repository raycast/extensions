import { globby } from "globby";
import fs from "fs";
import { parse } from "path";
import { CACHE_DIR, PLATFORM_NAMES } from "./constants";

export interface Page {
  command: string;
  filename: string;
  subtitle: string;
  markdown: string;
  url?: string;
  items: { description: string; command: string }[];
}

export interface Platform {
  name: string;
  pages: Page[];
}

export async function readPages() {
  return await Promise.all(
    PLATFORM_NAMES.map(async (platformName) => {
      const filepaths = await globby(`${CACHE_DIR}/${platformName}/*`);
      const pages = await Promise.all(filepaths.map((filepath) => parsePage(filepath)));
      return {
        name: platformName,
        pages: pages,
      } as Platform;
    }),
  );
}

export async function parsePage(pathToFile: string): Promise<Page> {
  const markdown = await fs.promises.readFile(pathToFile).then((buffer) => buffer.toString());

  const subtitle: string[] = [];
  const commands: string[] = [];
  const descriptions: string[] = [];
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
    filename: parse(pathToFile).name,
    subtitle: subtitle[0],
    markdown: markdown,
    url,
    items: zip(commands, descriptions).map(([command, description]) => ({
      command: command as string,
      description: description as string,
    })),
  };
}

export function zip(arr1: string[], arr2: string[]) {
  return arr1.map((value, index) => [value, arr2[index]]);
}

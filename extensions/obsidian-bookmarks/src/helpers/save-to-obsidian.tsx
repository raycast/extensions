import { getPreferenceValues } from "@raycast/api";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import dedent from "ts-dedent";
import { LinkFormState } from "../hooks/use-link-form";
import { File, FrontMatter, Preferences } from "../types";
import { addToLocalStorageFiles } from "./localstorage-files";
import { addToLocalStorageTags } from "./localstorage-tags";
import slugify from "./slugify";
import tagify from "./tagify";

function formatDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function exists(filename: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filename);
    return Boolean(stat);
  } catch (err) {
    return false;
  }
}

async function getFileName(filename: string): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let file = path.join(prefs.vaultPath, prefs.bookmarksPath, filename);
  let index = 1;
  while (await exists(file)) {
    const newFilename = `${base}-${index++}.md`;
    file = path.join(prefs.vaultPath, prefs.bookmarksPath, newFilename);
  }
  return file;
}

export async function asFile(values: LinkFormState["values"]): Promise<File> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const attributes: FrontMatter = {
    url: values.url,
    title: values.title,
    tags: values.tags.flatMap((t) => tagify(t)),
    added: midnight,
    read: false,
  };

  const body = dedent`
  # [${values.title.replace(/[[\]]/g, "")}](${values.url})
  
  ${values.description}
  `;

  const frontmatter = dedent`
  url: ${JSON.stringify(attributes.url)}
  title: ${JSON.stringify(attributes.title)}
  tags: ${JSON.stringify(attributes.tags)}
  added: ${formatDate(midnight)}
  read: ${JSON.stringify(attributes.read)}
  `;

  const fileSlug = `${formatDate(midnight)}-${slugify(attributes.title)}`.slice(0, 150);
  const baseName = `${fileSlug}.md`;
  const fullPath = await getFileName(baseName);
  const fileName = path.basename(fullPath);

  return {
    attributes,
    frontmatter,
    body,
    fileName,
    fullPath,
    bodyBegin: 4 + frontmatter.length,
  };
}

export default async function saveToObsidian(file: File): Promise<string> {
  const template = dedent`
    ---
    url: ${JSON.stringify(file.attributes.url)}
    title: ${JSON.stringify(file.attributes.title)}
    tags: ${JSON.stringify(file.attributes.tags.flatMap((t) => tagify(t)))}
    added: ${formatDate(file.attributes.added)}
    read: ${JSON.stringify(file.attributes.read)}
    ---

    ${file.body}
  `;

  await Promise.allSettled([
    fs.writeFile(file.fullPath, template, { encoding: "utf-8" }),
    addToLocalStorageTags(file.attributes.tags),
    addToLocalStorageFiles([file]),
  ]);
  return file.fileName;
}

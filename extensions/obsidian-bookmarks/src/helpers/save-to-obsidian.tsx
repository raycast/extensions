import * as fs from "node:fs/promises";
import * as path from "node:path";

import dedent from "ts-dedent";

import { LinkFormState } from "../hooks/use-link-form";
import { File, FrontMatter, Preferences } from "../types";

import { fileExists } from "./file-utils";
import getPublisher from "./get-publisher";
import { addToLocalStorageFiles } from "./localstorage-files";
import { addToLocalStorageTags } from "./localstorage-tags";
import slugify from "./slugify";
import tagify from "./tagify";
import { getSaveSubfolderPath } from "./vault-path";
import { getPreferenceValues } from "@raycast/api";

function formatDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getFileName(filename: string): Promise<string> {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const savePath = await getSaveSubfolderPath();
  let file = path.join(savePath, filename);
  let index = 1;
  while (await fileExists(file)) {
    const newFilename = `${base}-${index++}.md`;
    file = path.join(savePath, newFilename);
  }
  return file;
}

export async function asFile(values: LinkFormState["values"]): Promise<File> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const attributes: FrontMatter = {
    source: values.url,
    publisher: getPublisher(values.url),
    title: values.title,
    tags: values.tags.flatMap((t) => tagify(t)),
    saved: midnight,
    read: false,
  };

  const body = dedent`
  # [${values.title.replace(/[[\]]/g, "")}](${values.url})

  ${values.description}
  `;

  const frontmatter = dedent`
  title: ${JSON.stringify(attributes.title)}
  saved: ${formatDate(midnight)}
  source: ${JSON.stringify(attributes.source)}
  publisher: ${JSON.stringify(attributes.publisher)}
  read: ${JSON.stringify(attributes.read)}
  tags: ${JSON.stringify(attributes.tags)}
  `;

  const { datePrefix } = getPreferenceValues<Preferences>();
  const prefix = datePrefix ? formatDate(midnight) + "-" : "";
  const fileSlug = `${prefix}${slugify(attributes.title)}`.slice(0, 150);
  const baseName = `${fileSlug}.md`;
  const fullPath = await getFileName(baseName);
  const fileName = path.basename(fullPath);
  const mtime = 1;

  return {
    attributes,
    frontmatter,
    body,
    fileName,
    fullPath,
    mtime,
    bodyBegin: 4 + frontmatter.length,
  };
}

export default async function saveToObsidian(file: File): Promise<string> {
  // Combine the form tags with the required tags
  const requiredTags = tagify(getPreferenceValues<Preferences>().requiredTags);
  const combinedTags = file.attributes.tags.flatMap((t) => tagify(t)).concat(requiredTags);

  const template = dedent`
    ---
    title: ${JSON.stringify(file.attributes.title)}
    saved: ${formatDate(file.attributes.saved)}
    source: ${JSON.stringify(file.attributes.source)}
    publisher: ${JSON.stringify(file.attributes.publisher)}
    read: ${JSON.stringify(file.attributes.read)}
    tags: ${JSON.stringify(combinedTags)}
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

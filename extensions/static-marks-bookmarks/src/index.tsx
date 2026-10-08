import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast, Icon, Image } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import fs from "fs/promises";
import path from "path";
import { useRef } from "react";
import YAML from "yaml";
import fetch from "cross-fetch";

export default function Command() {
  const abortable = useRef<AbortController>(null);
  const { isLoading, data } = useCachedPromise(
    parseFetchYamlResponse,
    [getPreferenceValues()["static-mark-yaml-url"]],
    { abortable },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarks...">
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.url} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { readonly searchResult: LinkResult }) {
  const parents = [{ text: searchResult.parents.join(" > "), icon: Icon.Folder }];

  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      icon={getFavicon(searchResult.url, { mask: Image.Mask.RoundedRectangle, fallback: Icon.Bookmark })}
      accessories={parents}
      keywords={searchResult.keywords}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
            <Action.CopyToClipboard title="Copy Link" content={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function parseYamlFromUrl(url: string): Promise<LinkResult[]> {
  const bookmarksUrlRes = await fetch(url);
  if (bookmarksUrlRes.status === 404) throw new Error("YAML file not found");

  const allBookmarks = await bookmarksUrlRes.text();
  const json = YAML.parse(allBookmarks);
  return flattenBookmarks({ json, bookmarksList: [], parents: [] });
}

async function parseYamlFromFile(filePath: string): Promise<LinkResult[]> {
  const allBookmarks = await fs.readFile(filePath, "utf8");
  const json = YAML.parse(allBookmarks);
  return flattenBookmarks({ json, bookmarksList: [], parents: [] });
}

async function parseYamlFromDirectory(dirPath: string): Promise<LinkResult[]> {
  const files = await fs.readdir(dirPath);
  const yamlFiles = files.filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));

  if (yamlFiles.length === 0) {
    throw new Error("No YAML files found in the specified directory");
  }

  const linkResults: LinkResult[] = [];

  for (const file of yamlFiles) {
    const filePath = path.join(dirPath, file);
    try {
      const content = await fs.readFile(filePath, "utf8");
      const json = YAML.parse(content);

      const filename = path.basename(file, path.extname(file));
      const fileBookmarks = flattenBookmarks({
        json,
        bookmarksList: [],
        parents: [filename],
      });

      linkResults.push(...fileBookmarks);
    } catch (error) {
      console.warn(`Failed to read or parse file ${file}:`, error);
    }
  }

  if (linkResults.length === 0) {
    throw new Error("No valid YAML files could be read from the directory");
  }

  return linkResults;
}

async function parseFetchYamlResponse(url: string) {
  try {
    if (url.startsWith("http")) {
      return await parseYamlFromUrl(url);
    } else {
      const stats = await fs.stat(url);

      if (stats.isDirectory()) {
        return await parseYamlFromDirectory(url);
      } else {
        return await parseYamlFromFile(url);
      }
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: (error as Error).message,
    });
  }
}

function isValidParent(key: string): boolean {
  return !Number(key) && Number(key) !== 0;
}

function isValidURL(value: unknown): boolean {
  return typeof value == "string" && value.startsWith("http");
}

function getBookmarkUrl(value: unknown): string[] {
  let urls: string[] = [];

  if (typeof value == "string") {
    urls = [value];
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      if (isValidURL(item)) {
        urls.push(item);
      }
    });
  }

  return urls;
}

function isValidBookmark(value: unknown): boolean {
  const urls = getBookmarkUrl(value);
  return urls.length ? urls[0].startsWith("http") : false;
}

function getBookmarkDescription(value: unknown): string {
  if (typeof value == "string") {
    return "";
  }

  if (Array.isArray(value)) {
    const descriptionsArray: string[] = [];
    value.forEach((item) => {
      if (typeof item === "string" && !isValidBookmark(item)) {
        descriptionsArray.push(item);
      }
    });

    return descriptionsArray.join(" - ").trim();
  }

  return "";
}

function flattenBookmarks({ json, bookmarksList, parents }: flattenBookmarksType) {
  for (const [key, value] of Object.entries(json)) {
    if (isValidBookmark(value)) {
      const bookmarkUrls = getBookmarkUrl(value);
      const bookmarkDescription = getBookmarkDescription(value);
      const bookmarkParents = parents;
      const bookmarkKeywords = [
        ...parents.flatMap((parent) => parent.split(" ")),
        ...(bookmarkDescription.length ? bookmarkDescription.split(" ") : []),
      ];

      bookmarkUrls.forEach((bookmarkUrl) => {
        bookmarksList.push({
          name: key,
          description: bookmarkDescription,
          url: bookmarkUrl,
          parents: bookmarkParents,
          keywords: bookmarkKeywords,
        });
      });

      if (Array.isArray(value)) {
        const bookmarkChildren: unknown[] = [];

        value.forEach((item) => {
          if (typeof item === "object") {
            bookmarkChildren.push(item);
          }
        });

        const currentParents = [...parents, key];

        flattenBookmarks({ json: bookmarkChildren, bookmarksList, parents: currentParents });
      }
    } else if (typeof value !== "string") {
      const currentParents = isValidParent(key) ? [...parents, key] : [...parents];

      flattenBookmarks({ json: value as unknown[], bookmarksList, parents: currentParents });
    }
  }

  return bookmarksList;
}

type flattenBookmarksType = {
  json: unknown[];
  bookmarksList: LinkResult[];
  parents: string[];
};

type LinkResult = {
  name: string;
  description: string;
  url: string;
  parents: string[];
  keywords: string[];
};

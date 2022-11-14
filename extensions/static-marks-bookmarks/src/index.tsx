import { ActionPanel, Action, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import os from "os";
import fs from "fs/promises";
import { useRef } from "react";
import YAML from "yaml";

const bookmarksFile = getPreferenceValues()["static-mark-yaml-file"] || `${os.homedir()}/bookmarks.yml`;

export default function Command() {
  const abortable = useRef<AbortController>();
  const { isLoading, data } = useCachedPromise(parseFetchYamlResponse, [bookmarksFile], {
    abortable,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarks...">
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult, index) => (
          <SearchListItem key={index} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: LinkResult }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={getFavicon(searchResult.url)}
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

async function parseFetchYamlResponse(url: string) {
  try {
    let bookmarks = "";

    if (url.startsWith("http")) {
      const bookmarksUrlRes = await fetch(url);
      if (bookmarksUrlRes.status === 404) throw new Error("YAML file not found");

      bookmarks = await bookmarksUrlRes.text();
    } else {
      bookmarks = await fs.readFile(url, "utf8");
    }

    const json = YAML.parse(bookmarks);
    const linkResults = flattenYaml(json, [], "");

    return linkResults;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: (error as Error).message,
    });
  }
}

function flattenYaml(json: unknown[], linkResults: LinkResult[], parentKey: string): LinkResult[] {
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === "string") {
      let descParent = "";
      if (parentKey.length > 0) {
        descParent = parentKey + " > ";
      }
      if (key.length > 1 && value.startsWith("http")) {
        linkResults.push({
          name: descParent + key,
          description: descParent + key,
          url: value,
        });
      } else if (value.startsWith("http")) {
        linkResults.push({
          name: descParent,
          description: descParent + key,
          url: value,
        });
      }
    } else {
      // Skip virtual parents (0, 1, 2 etc..)
      let nextParentKeyChain = parentKey;
      if (key.length > 1 && parentKey.length > 0) {
        nextParentKeyChain = parentKey + " > " + key;
      } else if (key.length > 1) {
        nextParentKeyChain = key;
      }
      flattenYaml(value as unknown[], linkResults, nextParentKeyChain);
    }
  }
  return linkResults;
}

interface LinkResult {
  name: string;
  description: string;
  url: string;
}

import {
  ActionPanel,
  CopyToClipboardAction,
  getPreferenceValues,
  ImageMask,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import fetch, { AbortError, RequestInit, Response } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import https = require("https");

const prefs: { instanceType: string; user: string; instance: string; unsafeHttps: boolean; token: string } =
  getPreferenceValues();
export const confluenceUrl =
  prefs.instanceType == "cloud" ? `https://${prefs.instance}/wiki` : `https://${prefs.instance}`;

const headers = {
  Accept: "application/json",
  Authorization:
    prefs.instanceType == "cloud"
      ? "Basic " + Buffer.from(`${prefs.user}:${prefs.token}`).toString("base64")
      : `Bearer ${prefs.token}`,
};

export default function Command() {
  const [results, isLoading, search] = useSearch();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search by name..." onSearchTextChange={search} throttle>
      <List.Section title="Results">
        {results.length > 0 &&
          results.map((searchResult) => <SearchListItem key={searchResult.id} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
}

function useSearch() {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setIsLoading(true);
      try {
        const response = await searchConfluence(searchText, cancelRef.current.signal);
        setResults(response);
      } catch (error) {
        if (error instanceof AbortError) {
          return;
        }
        showToast(ToastStyle.Failure, "Could not perform search", String(error));
      } finally {
        setIsLoading(false);
      }
    },
    [cancelRef, setIsLoading, setResults]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return [results, isLoading, search] as const;
}

async function searchConfluence(searchText: string, signal: AbortSignal) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: !prefs.unsafeHttps,
  });
  const init: RequestInit = {
    headers,
    method: "get",
    signal: signal,
    agent: httpsAgent,
  };
  const apiUrl = `${confluenceUrl}/rest/api/search?cql=title~"${searchText}*"&expand=content.version`;
  return fetch(apiUrl, init).then((response) => {
    return parseResponse(response);
  });
}

async function parseResponse(response: Response) {
  const json = (await response.json()) as APIResponse;
  const jsonResults = (json?.results as ResultsItem[]) ?? [];
  return jsonResults
    .filter((jsonResult: ResultsItem) => jsonResult.content)
    .map((jsonResult: ResultsItem) => {
      return {
        id: jsonResult.content.id as string,
        name: jsonResult.content.title as string,
        type: jsonResult.content.type as string,
        url: jsonResult.content._links.webui as string,
        author: jsonResult.content.version.by.displayName as string,
        icon: jsonResult.content.version.by.profilePicture.path as string,
        subTitle: jsonResult.resultGlobalContainer.title as string,
        mediaType: jsonResult.content?.metadata?.mediaType as string,
      };
    });
}

function getConfluenceIcon(searchResult: SearchResult) {
  if (searchResult.type == "page") {
    return "confluence-icon-page.svg";
  }
  if (searchResult.mediaType) {
    switch (true) {
      case searchResult.mediaType.startsWith("image"):
        return "confluence-icon-image.svg";
      case searchResult.mediaType == "application/pdf":
        return "confluence-icon-pdf.svg";
      case searchResult.mediaType == "application/zip":
        return "confluence-icon-zip.svg";
      case searchResult.mediaType == "application/octet-stream":
        return "confluence-icon-file.svg";
      case searchResult.mediaType.indexOf("audio") > -1:
        return "confluence-icon-audio.svg";
      case searchResult.mediaType.indexOf("video") > -1:
        return "confluence-icon-video.svg";
      case searchResult.mediaType.indexOf("sheet") > -1:
        return "confluence-icon-spreadsheet.svg";
    }
    return "confluence-icon-file.svg";
  }
  return "confluence-icon-all.svg";
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  console.log(searchResult.type, searchResult.mediaType);
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.subTitle}
      keywords={[searchResult.name, searchResult.type]}
      accessoryTitle={searchResult.author}
      accessoryIcon={{ source: `https://${prefs.instance}${searchResult.icon}`, mask: ImageMask.Circle }}
      icon={{ source: getConfluenceIcon(searchResult) }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={confluenceUrl + searchResult.url} />
            <CopyToClipboardAction
              title="Copy URL"
              content={confluenceUrl + searchResult.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
  id: string;
  name: string;
  type: string;
  url: string;
  author: string;
  icon: string;
  subTitle: string;
  mediaType: string;
}

interface APIResponse {
  results: ResultsItem[];
  start: number;
  limit: number;
  size: number;
  _links: _links;
}
interface ResultsItem {
  content: Content;
  title: string;
  excerpt: string;
  url: string;
  resultGlobalContainer: ResultGlobalContainer;
  breadcrumbs: string[];
  entityType: string;
  iconCssClass: string;
  lastModified: string;
  friendlyLastModified: string;
  score: number;
}

interface Metadata {
  mediaType: string;
  comment: string;
}
interface Content {
  id: string;
  type: string;
  status: string;
  title: string;
  version: Version;
  macroRenderedOutput: Record<string, unknown>;
  extensions: Extensions;
  _expandable: _expandable;
  _links: _links;
  metadata: Metadata;
}
interface Version {
  by: By;
  when: string;
  friendlyWhen: string;
  message: string;
  number: number;
  minorEdit: boolean;
  syncRev?: string;
  syncRevSource?: string;
  confRev: string;
  contentTypeModified: boolean;
  _expandable: _expandable;
  _links: _links;
}
interface By {
  type: string;
  accountId: string;
  accountType: string;
  email: string;
  publicName: string;
  timeZone: string;
  profilePicture: ProfilePicture;
  displayName: string;
  isExternalCollaborator: boolean;
  _expandable: _expandable;
  _links: _links;
}
interface ProfilePicture {
  path: string;
  width: number;
  height: number;
  isDefault: boolean;
}
interface _expandable {
  operations?: string;
  personalSpace?: string;
  collaborators?: string;
  content?: string;
  childTypes?: string;
  container?: string;
  metadata?: string;
  schedulePublishDate?: string;
  children?: string;
  restrictions?: string;
  history?: string;
  ancestors?: string;
  body?: string;
  descendants?: string;
  space?: string;
}
interface _links {
  self: string;
  tinyui?: string;
  editui?: string;
  webui?: string;
  base?: string;
  context?: string;
}
interface Extensions {
  position: number;
}
interface ResultGlobalContainer {
  title: string;
  displayUrl: string;
}

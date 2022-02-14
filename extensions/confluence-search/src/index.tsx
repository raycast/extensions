import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  ImageMask,
  getPreferenceValues,
  Icon,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch, { Response } from "node-fetch";

const prefs: { instance: string; user: string; token: string } = getPreferenceValues();
export const confluenceUrl = `https://${prefs.instance}`;

const headers = {
  Accept: "application/json",
  Authorization: "Basic " + Buffer.from(`${prefs.user}:${prefs.token}`).toString("base64"),
};

const init = {
  headers,
};

export default function Command() {
  const [results, setResults] = useState<SearchResult[]>([]);

  const [loadingState, setLoadingState] = useState(true);

  useEffect(() => {
    searchConfluence().then((response) => {
      setLoadingState(false);
      if (!response.ok) {
        const failureMessage = response.message ? response.message : response.statusText;
        showToast(ToastStyle.Failure, "API request failed", failureMessage);
      } else {
        parseResponse(response).then((response: SearchResult[]) => {
          setResults(response);
        });
      }
    });
  }, []);

  return (
    <List isLoading={loadingState} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results">
        {results && results.map((searchResult) => <SearchListItem key={searchResult.id} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
}

async function searchConfluence() {
  const apiUrl = `${confluenceUrl}/wiki/rest/api/content?expand=version`;
  const response = await fetch(apiUrl, init)
    .then((response) => {
      return response;
    })
    .catch((error) => {
      {
        return error;
      }
    });

  return response;
}

async function parseResponse(response: Response) {
  const json = (await response.json()) as APIResponse;
  const jsonResults = (json?.results as ResultsItem[]) ?? [];
  return jsonResults.map((jsonResult: ResultsItem) => {
    return {
      id: jsonResult.id as string,
      name: jsonResult.title as string,
      type: jsonResult.type as string,
      url: jsonResult._links.webui as string,
      author: jsonResult.version.by.displayName as string,
      icon: jsonResult.version.by.profilePicture.path as string,
    };
  });
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.type}
      keywords={[searchResult.name, searchResult.type]}
      accessoryTitle={searchResult.author}
      accessoryIcon={{ source: `${confluenceUrl}${searchResult.icon}`, mask: ImageMask.Circle }}
      icon={Icon.Document}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={confluenceUrl + "/wiki" + searchResult.url} />
            <CopyToClipboardAction
              title="Copy URL"
              content={confluenceUrl + "/wiki" + searchResult.url}
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
}

interface APIResponse {
  results: ResultsItem[];
  start: number;
  limit: number;
  size: number;
  _links: _links;
}
interface ResultsItem {
  id: string;
  type: string;
  status: string;
  title: string;
  version: Version;
  macroRenderedOutput: Record<string, unknown>;
  extensions: Extensions;
  _expandable: _expandable;
  _links: _links;
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

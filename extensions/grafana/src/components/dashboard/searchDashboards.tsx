import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { z } from "zod";

import { preferences } from "../../helpers/preferences";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { URLSearchParams } from "url";

const dashboardschema = z.object({
  id: z.string({ coerce: true }),
  uid: z.string({ coerce: true }),
  title: z.string(),
  uri: z.string(),
  url: z.string(),
  slug: z.string(),
  type: z.string(),
  tags: z.array(z.string()),
  isStarred: z.boolean(),
  folderId: z.number().optional(),
  folderUid: z.string().optional(),
  folderTitle: z.string().optional(),
  folderUrl: z.string().optional(),
  // sortMeta: z.number(),
});

const dashboardsSchema = z.array(dashboardschema);

export function SearchDashboards() {
  const [searchText, setSearchText] = useState("");

  const params = new URLSearchParams();
  params.append("limit", "50");
  params.append("type", "dash-db");
  params.append("query", !searchText ? "" : searchText);

  const { isLoading, data } = useFetch(`${preferences.rootApiUrl}/api/search?${params.toString()}`, {
    parseResponse,
    keepPreviousData: true,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
  });

  // https://developers.raycast.com/utilities/react-hooks/usefrecencysorting
  const { data: sortedData, visitItem } = useFrecencySorting(data);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search grafana dashboards..."
      throttle
    >
      <List.Section title="Results" subtitle={sortedData.length + ""}>
        {sortedData.map((dashboard) => (
          <List.Item
            key={dashboard.id}
            title={dashboard.title}
            subtitle={dashboard.folderTitle}
            accessories={dashboard.tags.map((tag) => ({
              tag,
            }))}
            icon={{
              source: Icon.AppWindow,
              tintColor: Color.Orange,
            }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={preferences.rootApiUrl + dashboard.url}
                    onOpen={() => visitItem(dashboard)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

async function parseResponse(response: Response) {
  type Json = Record<string, unknown>;
  const json = (await response.json()) as Json[] | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  // json.map((dashboard) => console.log(dashboard));

  const dashboards = dashboardsSchema.parse(json);
  // dashboards.map((dashboard) => console.log(dashboard));
  return dashboards;
}

import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { preferences } from "./helpers/preferences";
import { createExploreLink } from "./helpers/helpers";
import { datasourcesSchema } from "./datasource/datasource.schema";

export default function Command() {
  // https://grafana.com/docs/grafana-cloud/developer-resources/api-reference/http-api/data_source/
  // This API currently doesn’t handle pagination. The default maximum number of data sources returned is 5000. You can change this value in the default.ini file.
  const { isLoading, data } = useFetch(`${preferences.rootApiUrl}/api/datasources`, {
    parseResponse,
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
    method: "get",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
  });

  const { data: sortedData, visitItem } = useFrecencySorting(data);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Explore with a datasource..." throttle>
      {sortedData.map((datasource) => (
        <List.Item
          key={datasource.id}
          title={datasource.name}
          icon={{ source: `${preferences.rootApiUrl}/${datasource.typeLogoUrl}` }}
          accessories={[{ tag: datasource.type }]}
          keywords={[datasource.name, datasource.type, datasource.typeName ?? ""]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Explore with This Datasource"
                url={createExploreLink(datasource.uid)}
                onOpen={() => visitItem(datasource)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function parseResponse(response: Response) {
  type Json = Record<string, unknown>;
  const json = (await response.json()) as Json[] | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  const datasources = datasourcesSchema.parse(json);
  return datasources;
}

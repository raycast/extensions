import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { useEffect, useState } from "react";
import { preferences } from "../../helpers/preferences";
import { z } from "zod";

const datasourceSchema = z.object({
  id: z.string({ coerce: true }),
  orgId: z.string({ coerce: true }),
  uid: z.string(),
  name: z.string(),
  type: z.string(),
  typeLogoUrl: z.string(),
  typeName: z.string().optional(),
  url: z.string(),
  database: z.string(),
  isDefault: z.boolean(),
  readOnly: z.boolean(),
  // Data we don't care for now, could be added in the future:
  // basicAuth: z.boolean(),
  // jsonData: z
  //   .object({
  //     logLevelField: z.string().optional(),
  //     logMessageField: z.string().optional(),
  //     maxConcurrentShardRequests: z.number().optional(),
  //     timeField: z.string().optional(),
  //     // potentially other fields, such as httpHeaderName1
  //     // but not relevant for this Command.
  //   })
  //   .optional(),
  password: z.string().optional(),
  user: z.string(),
  access: z.string(),
});

const datasourcesSchema = z.array(datasourceSchema);

export function Command() {
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

  // https://developers.raycast.com/utilities/react-hooks/usefrecencysorting
  const { data: sortedData, visitItem } = useFrecencySorting(data);

  const createExploreLink = (datasourceUid: string) => {
    return (
      preferences.rootApiUrl +
      `/explore?${encodeURI(`schemaVersion=1&&panes={"zmo":{"datasource":"${datasourceUid}"}}`)}`
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Use a datasource..." throttle>
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
                title="Open datasource"
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

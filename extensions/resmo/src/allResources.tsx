import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import React, { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getApiKey, getDomain, integrationIconURL } from "./utils";
import type { Metadata, Resource, Resources, ResourceRow } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [showDetail, setShowDetail] = useState(false);
  const resmoDomain = getDomain();
  const resmoApiKey = getApiKey();

  const { data, isLoading } = useFetch<Resources>(resmoDomain + "api/explore/all/resources", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resmoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      freeText: searchText,
      integrations: selectedIntegration ? [selectedIntegration] : [],
      riskScores: [],
      resourceTypes: [],
      fields: [],
    }),
  });
  const { data: metadata } = useFetch<Metadata>(resmoDomain + "api/metadata", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + resmoApiKey,
      "Content-Type": "application/json",
    },
  });

  const integrations = metadata?.integrations;
  const integrationsList = Object.values(metadata?.integrations || {}).sort((int1, int2) =>
    int1.description.localeCompare(int2.description)
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your resources..."
      throttle
      isShowingDetail={showDetail}
      searchBarAccessory={
        metadata ? (
          <List.Dropdown
            tooltip="Select Integration"
            value={selectedIntegration ? integrations?.[selectedIntegration].description : "Select Integration"}
            onChange={setSelectedIntegration}
          >
            <List.Dropdown.Item title="All Integrations" value="" />
            {integrationsList.map((integration) => (
              <List.Dropdown.Item
                key={integration.name}
                title={integration.description}
                value={integration.name}
                icon={integrationIconURL(integration.name)}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      <List.EmptyView title="No Results" icon="noview.svg" />
      <List.Section title="Results" subtitle={String(data?.rows?.length)}>
        {data?.rows?.map((row, index) => (
          <ResourcesListItem
            key={row.name + "-" + row.referencedType + "-" + index}
            resource={row}
            resmoDomain={resmoDomain}
            setShowDetail={setShowDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ResourcesListItem({
  resource,
  resmoDomain,
  setShowDetail,
}: {
  resource: ResourceRow;
  resmoDomain: string;
  setShowDetail: Dispatch<SetStateAction<boolean>>;
}) {
  const riskScore = resource._meta.riskScore;
  const icon = {
    0: { source: Icon.Circle, tintColor: "gray" },
    1: { source: Icon.CircleProgress100, tintColor: "#fde047" },
    2: { source: Icon.CircleProgress100, tintColor: "#facc15" },
    3: { source: Icon.CircleProgress100, tintColor: "#fb923c" },
    4: { source: Icon.CircleProgress100, tintColor: "#ef4444" },
  }[riskScore];
  return (
    <List.Item
      accessories={[{ icon }]}
      title={resource.name}
      subtitle={resource.referencedType}
      icon={integrationIconURL(resource._meta.integration.type)}
      detail={<ResourceDetail resource={resource} />}
      actions={
        <ActionPanel>
          <Action
            onAction={() => setShowDetail((current) => !current)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            icon={Icon.AppWindowSidebarLeft}
            title="Toggle Details"
          />
          <Action.OpenInBrowser
            url={resmoDomain + "explore/resources/" + resource._meta.type + "/" + resource._meta.recordId}
          />
        </ActionPanel>
      }
    />
  );
}

export function ResourceDetail({ resource }: { resource: ResourceRow }) {
  const resmoDomain = getDomain();
  const resmoApiKey = getApiKey();

  const { data, isLoading } = useFetch<Resource>(resmoDomain + `api/explore/resource/${resource._meta.recordId}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + resmoApiKey,
      "Content-Type": "application/json",
    },
  });

  const importantFields = data?.fields.filter(
    (field) => field.isImportant && ["String", "Int", "Double", "Boolean", "Number"].includes(field.type)
  );

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {data && (
            <>
              <List.Item.Detail.Metadata.Link
                title="Show on Resmo"
                text="Resmo"
                target={resmoDomain + "explore/resources/" + resource._meta.type + "/" + resource._meta.recordId}
              />
              {data.resourceLink && (
                <List.Item.Detail.Metadata.Link title="Show on Console" text="Console" target={data.resourceLink} />
              )}
              <List.Item.Detail.Metadata.Separator />
              {importantFields?.map(({ name }) => {
                const value = data?.row[name];
                return <List.Item.Detail.Metadata.Label key={name} title={name} text={String(value)} />;
              })}
            </>
          )}
          {isLoading && !data && <List.Item.Detail.Metadata.Label title="Loading..." />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

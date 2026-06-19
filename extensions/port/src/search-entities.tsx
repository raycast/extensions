import { Action, ActionPanel, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEntityUrl, searchEntities } from "./api/port-client";

const BLUEPRINT_ICONS: Record<string, Icon> = {
  service: Icon.Globe,
  microservice: Icon.Globe,
  repository: Icon.Book,
  deployment: Icon.Rocket,
  environment: Icon.Cloud,
  cluster: Icon.Network,
  team: Icon.TwoPeople,
  user: Icon.Person,
  api: Icon.Link,
  package: Icon.Box,
  library: Icon.Book,
  domain: Icon.Folder,
};

function getBlueprintIcon(blueprint: string): Icon {
  const lowerBlueprint = blueprint.toLowerCase();
  for (const [key, icon] of Object.entries(BLUEPRINT_ICONS)) {
    if (lowerBlueprint.includes(key)) {
      return icon;
    }
  }
  return Icon.Document;
}

function formatBlueprint(blueprint: string): string {
  return blueprint
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default function SearchEntities() {
  const [searchText, setSearchText] = useState("");

  const {
    data: entities,
    isLoading,
    error,
  } = useCachedPromise(
    async (query: string) => {
      if (!query || query.length < 2) {
        return [];
      }
      return await searchEntities(query);
    },
    [searchText],
    {
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: err.message,
        });
      },
    },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search entities by name or identifier..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {!searchText || searchText.length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Entities"
          description="Search your Port catalog by entity title or identifier. Type at least 2 characters to start searching."
        />
      ) : entities?.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No entities found"
          description={`No entities matching "${searchText}"`}
        />
      ) : (
        entities?.map((entity) => (
          <List.Item
            key={`${entity.blueprint}-${entity.identifier}`}
            icon={getBlueprintIcon(entity.blueprint)}
            title={entity.title || entity.identifier}
            subtitle={entity.identifier}
            accessories={[
              { tag: formatBlueprint(entity.blueprint) },
              ...(entity.team && entity.team.length > 0 ? [{ icon: Icon.TwoPeople, text: entity.team[0] }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Port" url={getEntityUrl(entity)} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={getEntityUrl(entity)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Identifier"
                    content={entity.identifier}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

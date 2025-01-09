import { useMemo, useState } from "react";

import { format } from "date-fns";

import { Action, ActionPanel, Color, Icon, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { FullNavigationHistoryResponse, Instance } from "../types";
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import { groupBy } from "lodash";
import useFavorites from "../hooks/useFavorites";
import FavoriteForm from "./FavoriteForm";
import { getSectionTitle } from "../utils/getSectionTitle";

export default function NavigationHistoryFull() {
  const {
    instances,
    isLoading: isLoadingInstances,
    addInstance,
    mutate: mutateInstances,
    selectedInstance,
    setSelectedInstance,
  } = useInstances();
  const { isUrlInFavorites, revalidateFavorites, addUrlToFavorites, removeFromFavorites } = useFavorites();
  const [errorFetching, setErrorFetching] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { id: instanceId = "", name: instanceName = "", username = "", password = "" } = selectedInstance || {};

  const instanceUrl = `https://${instanceName}.service-now.com`;

  const { isLoading, data, revalidate, pagination } = useFetch(
    (options) => {
      const terms = searchTerm.split(" ");
      const query = terms.map((t) => `^titleLIKE${t}^ORdescriptionLIKE${t}^ORurlLIKE${t}`).join("");
      return `${instanceUrl}/api/now/table/sys_ui_navigator_history?sysparm_query=${query}^userDYNAMIC90d1921e5f510100a9ad2572f2b477fe^ORDERBYDESCsys_created_on&sysparm_fields=title,description,url,sys_created_on,sys_id&sysparm_limit=100&sysparm_offset=${options.page * 100}`;
    },
    {
      headers: {
        Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
      },
      execute: !!selectedInstance,
      onError: (error) => {
        setErrorFetching(true);
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch navigation history", error.message);
      },

      mapResult(response: FullNavigationHistoryResponse) {
        setErrorFetching(false);

        return { data: response.result, hasMore: response.result.length > 0 };
      },
      keepPreviousData: true,
    },
  );

  const sections = useMemo(() => {
    return groupBy(data, (historyEntry) => getSectionTitle(historyEntry.sys_created_on || ""));
  }, [data]);

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((instance) => instance.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  return (
    <List
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      isLoading={isLoading}
      pagination={pagination}
      throttle
      searchBarAccessory={
        <List.Dropdown
          isLoading={isLoadingInstances}
          value={instanceId}
          tooltip="Select the instance you want to search in"
          onChange={(newValue) => {
            !isLoadingInstances && onInstanceChange(newValue);
          }}
        >
          <List.Dropdown.Section title="Instance Profiles">
            {instances.map((instance: Instance) => (
              <List.Dropdown.Item
                key={instance.id}
                title={instance.alias ? instance.alias : instance.name}
                value={instance.id}
                icon={{
                  source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
                  tintColor: instance.color,
                }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {selectedInstance ? (
        errorFetching ? (
          <List.EmptyView
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Could Not Fetch Results"
            description="Press ⏎ to refresh or try later again"
            actions={
              <ActionPanel>
                <Actions
                  revalidate={() => {
                    revalidate();
                    revalidateFavorites();
                  }}
                />
              </ActionPanel>
            }
          />
        ) : (
          Object.keys(sections).map((section) => (
            <List.Section
              key={section}
              title={section}
              subtitle={`${sections[section].length} ${sections[section].length == 1 ? "result" : "results"}`}
            >
              {sections[section].map((historyEntry) => {
                const path = historyEntry.url.startsWith("/") ? historyEntry.url : `/${historyEntry.url}`;
                const url = `${instanceUrl}${path}`;
                const table = historyEntry.url.split(".do")[0];
                const { icon: iconName, color: colorName } = getTableIconAndColor(table);

                const icon: Action.Props["icon"] = {
                  source: Icon[iconName as keyof typeof Icon],
                  tintColor: Color[colorName as keyof typeof Color],
                };
                const accessories: List.Item.Accessory[] = [
                  {
                    icon: Icon.Calendar,
                    tooltip: format(
                      new Date(historyEntry.sys_created_on + " UTC") || "",
                      "EEEE d MMMM yyyy 'at' HH:mm",
                    ),
                  },
                  {
                    icon: Icon.Link,
                    tooltip: decodeURIComponent(path),
                  },
                ];

                const favoriteId = isUrlInFavorites(url);
                if (favoriteId) {
                  accessories.unshift({
                    icon: { source: Icon.Star, tintColor: Color.Yellow },
                    tooltip: "Favorite",
                  });
                }

                const description = historyEntry.description?.replace(/\\'/g, "'");

                return (
                  <List.Item
                    key={historyEntry.sys_id}
                    icon={icon}
                    title={historyEntry.title}
                    subtitle={description}
                    keywords={[historyEntry.title, description || "", ...table.split("_")]}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title={historyEntry.title + (description ? ": " + description : "")}>
                          <Action.OpenInBrowser
                            title="Open in Servicenow"
                            url={url}
                            icon={{ source: "servicenow.svg" }}
                          />
                          <Action.CopyToClipboard
                            title="Copy URL"
                            content={url}
                            shortcut={Keyboard.Shortcut.Common.CopyPath}
                          />
                        </ActionPanel.Section>
                        {!favoriteId && (
                          <Action
                            title="Add Favorite"
                            icon={Icon.Star}
                            onAction={() => addUrlToFavorites(historyEntry.title, historyEntry.url)}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                          />
                        )}
                        {favoriteId && (
                          <>
                            <Action.Push
                              title="Edit Favorite"
                              icon={Icon.Pencil}
                              target={<FavoriteForm favoriteId={favoriteId} />}
                              shortcut={Keyboard.Shortcut.Common.Edit}
                            />
                            <Action
                              title="Remove Favorite"
                              icon={Icon.StarDisabled}
                              style={Action.Style.Destructive}
                              onAction={() => removeFromFavorites(favoriteId, historyEntry.title, false)}
                              shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                            />
                          </>
                        )}
                        <Actions
                          revalidate={() => {
                            revalidate();
                            revalidateFavorites();
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ))
        )
      ) : (
        <List.EmptyView
          title="No Instance Profiles Found"
          description="Add an Instance Profile to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Instance Profile"
                target={<InstanceForm onSubmit={addInstance} />}
                onPop={mutateInstances}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

import { useMemo, useState } from "react";

import { format, differenceInCalendarDays, isThisYear } from "date-fns";

import { Action, ActionPanel, Color, Icon, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { NavigationHistoryResponse, Instance } from "../types";
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import { groupBy } from "lodash";
import useFavorites from "../hooks/useFavorites";
import { getSectionTitle } from "../utils/getSectionTitle";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { useAuthHeader } from "../hooks/useAuthHeader";
import { expandKeywords } from "../utils/expandKeywords";

export default function NavigationHistory() {
  const {
    instances,
    isLoading: isLoadingInstances,
    addInstance,
    mutate: mutateInstances,
    selectedInstance,
    setSelectedInstance,
  } = useInstances();
  const { isInFavorites, revalidateFavorites } = useFavorites();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { id: instanceId = "", name: instanceName = "" } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);

  const { isLoading, data, error, revalidate, pagination } = useFetch(`${instanceUrl}/api/now/ui/history`, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
    execute: !!selectedInstance && !!authHeader,
    onError: (error) => {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Could Not Fetch Navigation History",
        message: error.message,
      });
    },

    mapResult(response: NavigationHistoryResponse) {
      return { data: response.result.list };
    },
    keepPreviousData: true,
  });

  const sections = useMemo(() => {
    return groupBy(data, (historyEntry) => getSectionTitle(historyEntry.createdString || ""));
  }, [data]);

  const onInstanceChange = (newValue: string) => {
    const found = instances.find((instance) => instance.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
    }
  };

  return (
    <List
      searchText={searchTerm}
      onSearchTextChange={setSearchTerm}
      searchBarPlaceholder="Filter by title, description, table..."
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
                title={instanceLabel(instance)}
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
        error ? (
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
                const url = buildServiceNowUrl(instanceName, path);
                const table = historyEntry.url.split(".do")[0];
                const { icon: iconName, color: colorName } = getTableIconAndColor(table);

                const icon: Action.Props["icon"] = {
                  source: Icon[iconName as keyof typeof Icon],
                  tintColor: Color[colorName as keyof typeof Color],
                };
                const createdDate = new Date((historyEntry.createdString || "") + " UTC");
                const daysAgo = differenceInCalendarDays(new Date(), createdDate);
                const dateLabel =
                  daysAgo === 0
                    ? format(createdDate, "HH:mm")
                    : daysAgo <= 6
                      ? format(createdDate, "EEE")
                      : isThisYear(createdDate)
                        ? format(createdDate, "d MMM")
                        : format(createdDate, "yyyy");
                const accessories: List.Item.Accessory[] = [
                  {
                    text: dateLabel,
                    tooltip: format(createdDate, "EEEE d MMMM yyyy 'at' HH:mm"),
                  },
                  {
                    icon: Icon.Link,
                    tooltip: decodeURIComponent(path),
                  },
                ];

                const favoriteId = isInFavorites(path);
                if (favoriteId) {
                  accessories.unshift({
                    icon: { source: Icon.Star, tintColor: Color.Yellow },
                    tooltip: "Favorite",
                  });
                }

                const description = historyEntry.description?.replace(/\\'/g, "'");

                return (
                  <List.Item
                    key={historyEntry.id}
                    icon={icon}
                    title={historyEntry.title}
                    subtitle={description}
                    keywords={expandKeywords(historyEntry.title, description, table)}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title={historyEntry.title + (description ? ": " + description : "")}>
                          <Action.OpenInBrowser
                            title="Open in ServiceNow"
                            url={url}
                            icon={{ source: "servicenow.svg" }}
                          />
                          <Action.CopyToClipboard
                            title="Copy URL"
                            content={url}
                            shortcut={Keyboard.Shortcut.Common.CopyPath}
                          />
                        </ActionPanel.Section>
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

import { useMemo, useState } from "react";

import { Action, ActionPanel, Color, Icon, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { NavigationMenuResponse, Instance, Module } from "../types";
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import useFavorites from "../hooks/useFavorites";
import { filter } from "lodash";
import { getIconForModules } from "../utils/getIconForModules";
import FavoriteForm from "./FavoriteForm";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";

export default function NavigationMenu(props: { groupId?: string }) {
  const { groupId = "" } = props;
  const {
    instances,
    isLoading: isLoadingInstances,
    addInstance,
    mutate: mutateInstances,
    selectedInstance,
    setSelectedInstance,
  } = useInstances();
  const {
    isInFavorites,
    isMenuInFavorites,
    revalidateFavorites,
    addApplicationToFavorites,
    addModuleToFavorites,
    removeFromFavorites,
  } = useFavorites();
  const [errorFetching, setErrorFetching] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { id: instanceId = "", name: instanceName = "", username = "", password = "", full } = selectedInstance || {};

  const instanceUrl = `https://${instanceName}.service-now.com`;

  const { isLoading, data, revalidate } = useFetch(
    () => {
      return `${instanceUrl}/api/now/ui/navigator`;
    },
    {
      headers: {
        Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
      },
      execute: selectedInstance && !groupId,
      onError: (error) => {
        setErrorFetching(true);
        console.error(error);
        showToast(Toast.Style.Failure, "Could not fetch menu entries", error.message);
      },

      mapResult(response: NavigationMenuResponse) {
        if (response && response.result && response.result.length === 0) {
          setErrorFetching(true);
          showToast(Toast.Style.Failure, "Could not fetch menu entries");
          return { data: [] };
        }
        setErrorFetching(false);
        return { data: response.result };
      },
      keepPreviousData: true,
    },
  );

  const filterByGroup = useMemo(() => {
    if (!groupId) return data;
    return filter(data, (menu) => menu.id === groupId);
  }, [data, groupId]);

  const numberOfModulesPerGroup = useMemo(() => {
    if (!data) return {};

    const result: { [key: string]: number } = {};

    const recursiveCount = (modules: Module[]): number => {
      return modules.reduce((acc, module) => acc + (module.modules ? recursiveCount(module.modules) : 1), 0);
    };

    data.forEach((group) => {
      result[group.id] = recursiveCount(group.modules!);
    });

    return result;
  }, [data]);

  const recursiveFilter = (modules: Module[], terms: string[], keywords: string[]): Module[] => {
    return modules
      .map((module) => {
        const newKeywords = module.title ? [...keywords, module.title.toLowerCase()] : keywords;
        const matches = terms.every((term) => newKeywords.some((string) => string.includes(term.toLowerCase())));

        const filteredModules = module.modules ? recursiveFilter(module.modules, terms, newKeywords) : [];
        if (matches || filteredModules.length > 0) {
          return {
            ...module,
            modules: filteredModules,
          };
        }
      })
      .filter((favorite) => favorite != undefined);
  };

  const filteredData = useMemo(() => {
    if (searchTerm === "") return filterByGroup;
    const terms = searchTerm.split(" ");
    return filterByGroup ? recursiveFilter(filterByGroup, terms, []) : [];
  }, [filterByGroup, searchTerm]);

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((instance) => instance.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  return (
    <List
      onSearchTextChange={setSearchTerm}
      isLoading={isLoading}
      searchBarPlaceholder="Filter by menu, section, module..."
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
        ) : searchTerm == "" && groupId == "" ? (
          <List.Section
            key={"groups-total"}
            title={"Menus"}
            subtitle={`${filteredData?.length} ${filteredData?.length == 1 ? "result" : "results"}`}
          >
            {filteredData?.map((group) => {
              const numberOfModules = numberOfModulesPerGroup[group.id];
              const accessories: List.Item.Accessory[] = [
                {
                  icon: getIconForModules(numberOfModules),
                  text: numberOfModules.toString(),
                  tooltip: `Modules: ${numberOfModules}`,
                },
              ];
              const favoriteId = isMenuInFavorites(group.id);
              if (favoriteId) {
                accessories.unshift({
                  icon: { source: Icon.Star, tintColor: Color.Yellow },
                  tooltip: "Favorite",
                });
              }

              return (
                <List.Item
                  key={group.id}
                  title={group.title}
                  accessories={accessories}
                  icon={{ source: Icon.Folder, tintColor: Color.Green }}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title={group.title}>
                        <Action.Push
                          title="Browse"
                          icon={Icon.ChevronRight}
                          target={<NavigationMenu groupId={group.id} />}
                        />
                      </ActionPanel.Section>
                      {!favoriteId && full == "true" && (
                        <Action
                          title="Add Favorite"
                          icon={Icon.Star}
                          onAction={() => addApplicationToFavorites(group.id, group.title, group.modules || [])}
                          shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                        />
                      )}
                      {favoriteId && full == "true" && (
                        <Action
                          title="Remove Favorite"
                          icon={Icon.StarDisabled}
                          style={Action.Style.Destructive}
                          onAction={() => removeFromFavorites(favoriteId, group.title, true)}
                          shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                        />
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
        ) : (
          filteredData?.map((group) => {
            const numberOfModules = numberOfModulesPerGroup[group.id];
            return (
              <List.Section
                key={group.id}
                title={group.title}
                subtitle={`${numberOfModules} ${numberOfModules == 1 ? "result" : "results"}`}
              >
                {group.modules?.map((module) => {
                  if (module.type == "SEPARATOR" && module.modules) {
                    return module.modules.map((m) => {
                      const uri = `${m.uri?.startsWith("/") ? "" : "/"}${m.uri}`;
                      return (
                        <ModuleItem
                          key={m.id}
                          module={m}
                          url={buildServiceNowUrl(instanceName, m.uri || "")}
                          revalidate={() => {
                            revalidate();
                            revalidateFavorites();
                          }}
                          group={group.title}
                          section={module.title}
                          favoriteId={isInFavorites(uri)}
                          addToFavorites={addModuleToFavorites}
                          removeFromFavorites={removeFromFavorites}
                          full={full == "true"}
                        />
                      );
                    });
                  }
                  const uri = `${module.uri?.startsWith("/") ? "" : "/"}${module.uri}`;
                  return (
                    <ModuleItem
                      key={module.id}
                      module={module}
                      url={buildServiceNowUrl(instanceName, module.uri || "")}
                      revalidate={() => {
                        revalidate();
                        revalidateFavorites();
                      }}
                      group={group.title}
                      favoriteId={isInFavorites(uri)}
                      addToFavorites={addModuleToFavorites}
                      removeFromFavorites={removeFromFavorites}
                      full={full == "true"}
                    />
                  );
                })}
              </List.Section>
            );
          })
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

function ModuleItem(props: {
  module: Module;
  url: string;
  favoriteId: string;
  revalidate: () => void;
  addToFavorites: (id: string, title: string, url: string) => void;
  removeFromFavorites: (id: string, title: string, isGroup: boolean) => void;
  group: string;
  section?: string;
  full: boolean;
}) {
  const { module, url, favoriteId, revalidate, addToFavorites, removeFromFavorites, group, section = "", full } = props;
  const { icon: iconName, color: colorName } = getTableIconAndColor(module.tableName || "");
  const icon: Action.Props["icon"] = {
    source: Icon[iconName as keyof typeof Icon],
    tintColor: Color[colorName as keyof typeof Color],
  };

  const accessories: List.Item.Accessory[] = [
    {
      icon: Icon.Link,
      tooltip: decodeURIComponent(module.uri || ""),
    },
  ];

  if (section)
    accessories.unshift({
      tag: { value: section },
      tooltip: `Section: ${section}`,
    });

  if (favoriteId) {
    accessories.unshift({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite",
    });
  }
  return (
    <List.Item
      icon={icon}
      title={module.title}
      accessories={accessories}
      keywords={[...group.split(" "), ...section.split(" "), ...module.title.split(" ")]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={module.title}>
            <Action.OpenInBrowser
              title="Open in ServiceNow"
              url={decodeURIComponent(url)}
              icon={{ source: "servicenow.svg" }}
            />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
          </ActionPanel.Section>
          {!favoriteId && full && (
            <Action
              title="Add Favorite"
              icon={Icon.Star}
              onAction={() => addToFavorites(module.id, module.title, module.uri || "")}
              shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
            />
          )}
          {favoriteId && full && (
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
                onAction={() => removeFromFavorites(favoriteId, module.title, false)}
                shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
              />
            </>
          )}
          <Actions revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}

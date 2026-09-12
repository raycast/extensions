import { useMemo, useState } from "react";

import { Action, ActionPanel, Color, Icon, Keyboard, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { NavigationMenuResponse, Instance, Module } from "../types";

type IndexedModule = Module & { _titleLc: string; modules?: IndexedModule[] };

const annotate = (modules?: Module[]): IndexedModule[] | undefined => {
  if (!modules) return undefined;
  const out: IndexedModule[] = new Array(modules.length);
  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    out[i] = { ...m, _titleLc: (m.title ?? "").toLowerCase(), modules: annotate(m.modules) };
  }
  return out;
};
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import { getTableIconAndColor } from "../utils/getTableIconAndColor";
import useFavorites from "../hooks/useFavorites";
import { filter } from "lodash";
import { getIconForModules } from "../utils/getIconForModules";
import FavoriteForm from "./FavoriteForm";
import { buildServiceNowUrl } from "../utils/buildServiceNowUrl";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { instanceLabel } from "../utils/instanceLabel";
import { useAuthHeader } from "../hooks/useAuthHeader";

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
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { id: instanceId = "", name: instanceName = "", full } = selectedInstance || {};

  const instanceUrl = getInstanceBaseUrl({ name: instanceName });
  const authHeader = useAuthHeader(selectedInstance);

  const { isLoading, data, error, revalidate } = useFetch(
    () => {
      return `${instanceUrl}/api/now/ui/navigator`;
    },
    {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      execute: !!selectedInstance && !groupId && !!authHeader,
      onError: (error) => {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could Not Fetch Menu Entries",
          message: error.message,
        });
      },

      mapResult(response: NavigationMenuResponse) {
        if (response && response.result && response.result.length === 0) {
          throw new Error("Could not fetch menu entries");
        }
        return { data: annotate(response.result) ?? [] };
      },
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

  const filteredData = useMemo(() => {
    if (!filterByGroup) return [];
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return filterByGroup;
    const terms = term.split(" ").filter(Boolean);

    const walk = (modules: IndexedModule[], pathMatches: boolean[]): IndexedModule[] | null => {
      let kept: IndexedModule[] | null = null;

      for (let i = 0; i < modules.length; i++) {
        const m = modules[i];
        const nextPath = pathMatches.slice();
        for (let t = 0; t < terms.length; t++) {
          if (!nextPath[t] && m._titleLc.includes(terms[t])) nextPath[t] = true;
        }
        const selfFullMatch = nextPath.every(Boolean);

        if (!m.modules || m.modules.length === 0) {
          if (selfFullMatch) {
            if (kept) kept.push(m);
          } else if (!kept) {
            kept = modules.slice(0, i);
          }
          continue;
        }

        if (selfFullMatch) {
          if (kept) kept.push(m);
          continue;
        }

        const childResult = walk(m.modules, nextPath);
        if (childResult === null) {
          if (!kept) kept = modules.slice(0, i);
        } else if (childResult === m.modules) {
          if (kept) kept.push(m);
        } else {
          if (!kept) kept = modules.slice(0, i);
          kept.push({ ...m, modules: childResult });
        }
      }

      if (kept === null) return modules;
      return kept.length > 0 ? kept : null;
    };

    const result = walk(filterByGroup as IndexedModule[], new Array(terms.length).fill(false));
    return result ?? [];
  }, [filterByGroup, searchTerm]);

  const onInstanceChange = (newValue: string) => {
    const found = instances.find((instance) => instance.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
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
  const keywords = useMemo(
    () => `${group} ${section} ${module.title}`.split(" ").filter(Boolean),
    [group, section, module.title],
  );
  return (
    <List.Item
      icon={icon}
      title={module.title}
      accessories={accessories}
      keywords={keywords}
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

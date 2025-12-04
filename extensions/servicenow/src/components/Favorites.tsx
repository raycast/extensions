import { useMemo, useState } from "react";

import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, LocalStorage } from "@raycast/api";

import { Favorite, Instance } from "../types";
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import { filter } from "lodash";
import { getIconForModules } from "../utils/getIconForModules";
import useFavorites from "../hooks/useFavorites";
import FavoriteForm from "./FavoriteForm";
import FavoriteItem from "./FavoriteItem";

export default function Favorites(props: { groupId?: string; revalidate?: () => void }) {
  const { groupId = "", revalidate: revalidateParent } = props;
  const {
    instances,
    isLoading: isLoadingInstances,
    addInstance,
    mutate: mutateInstances,
    selectedInstance,
    setSelectedInstance,
  } = useInstances();
  const {
    favorites: data,
    isLoading,
    revalidateFavorites: revalidate,
    removeFromFavorites,
    errorFetching,
  } = useFavorites();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { id: instanceId = "", full } = selectedInstance || {};

  const filterByGroup = useMemo(() => {
    if (!groupId) return data;
    return filter(data, (favorite) => favorite.id === groupId);
  }, [data, groupId]);

  const numberOfFavoritesPerGroup = useMemo(() => {
    if (!data) return {};

    const result: { [key: string]: number } = {};

    const recursiveCount = (favorites: Favorite[]): number => {
      return favorites?.reduce(
        (acc, favorite) =>
          acc + (favorite.favorites ? recursiveCount(favorite.favorites) : !favorite.separator ? 1 : 0),
        0,
      );
    };

    data.forEach((favorite) => {
      if (!favorite.group) return;
      result[favorite.id] = recursiveCount(favorite.favorites!);
    });

    return result;
  }, [data]);

  const recursiveFilter = (favorites: Favorite[], terms: string[], keywords: string[]): Favorite[] => {
    return favorites
      .map((favorite) => {
        const newKeywords = [...keywords, favorite.title.toLowerCase()];
        const matches = terms.every((term) => newKeywords.some((string) => string.includes(term.toLowerCase())));

        const filteredFavorites = favorite.favorites ? recursiveFilter(favorite.favorites, terms, newKeywords) : [];
        if (matches || filteredFavorites.length > 0) {
          return {
            ...favorite,
            favorites: filteredFavorites,
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

  const groupedFavorites = useMemo(() => {
    return filter(filteredData, (favorite) => favorite.group);
  }, [filteredData]);

  const ungroupedFavorites = useMemo(() => {
    return filter(filteredData, (favorite) => !favorite.group);
  }, [filteredData]);

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
      searchBarPlaceholder="Filter by favorite, group, section"
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
                <Actions revalidate={revalidate} />
              </ActionPanel>
            }
          />
        ) : (
          <>
            {groupedFavorites &&
              (searchTerm == "" && groupId == "" ? (
                <List.Section
                  key={"groups"}
                  title="Groups"
                  subtitle={`${Object.keys(groupedFavorites).length} ${Object.keys(groupedFavorites).length > 1 ? "results" : "result"}`}
                >
                  {groupedFavorites.map((group) => {
                    const groupName = group.title;
                    const numberOfFavorites = numberOfFavoritesPerGroup[group.id];
                    const accessories: List.Item.Accessory[] = numberOfFavorites
                      ? [
                          {
                            icon: getIconForModules(numberOfFavorites),
                            text: numberOfFavorites.toString(),
                            tooltip: `Favorites: ${numberOfFavorites}`,
                          },
                        ]
                      : [];
                    return (
                      <List.Item
                        key={group.id}
                        title={groupName}
                        accessories={accessories}
                        icon={{ source: Icon.Folder, tintColor: Color.Green }}
                        actions={
                          <ActionPanel>
                            <ActionPanel.Section title={groupName}>
                              <Action.Push
                                title="Browse"
                                icon={Icon.ChevronRight}
                                target={<Favorites groupId={group.id} revalidate={revalidate} />}
                              />
                            </ActionPanel.Section>
                            {full == "true" && (
                              <>
                                <Action.Push
                                  title="Edit"
                                  icon={Icon.Pencil}
                                  target={<FavoriteForm favorite={group} revalidate={revalidate} />}
                                  shortcut={Keyboard.Shortcut.Common.Edit}
                                />
                                <Action
                                  title="Delete"
                                  icon={Icon.Trash}
                                  style={Action.Style.Destructive}
                                  onAction={() =>
                                    confirmAlert({
                                      title: "Delete Favorites Group",
                                      message: `Are you sure you want to delete "${group.title}"?`,
                                      primaryAction: {
                                        style: Alert.ActionStyle.Destructive,
                                        title: "Delete",
                                        onAction: () => {
                                          removeFromFavorites(group.id, groupName, true, revalidate);
                                        },
                                      },
                                    })
                                  }
                                  shortcut={Keyboard.Shortcut.Common.Remove}
                                />
                                <ActionPanel.Section title="Add">
                                  <Action.Push
                                    title="Favorites Group"
                                    icon={Icon.Folder}
                                    target={<FavoriteForm add="group" revalidate={revalidate} />}
                                    shortcut={Keyboard.Shortcut.Common.Edit}
                                  />
                                  <Action.Push
                                    title="Favorite"
                                    icon={Icon.Star}
                                    target={<FavoriteForm add="favorite" groupId={group.id} revalidate={revalidate} />}
                                    shortcut={Keyboard.Shortcut.Common.Edit}
                                  />
                                </ActionPanel.Section>
                              </>
                            )}
                            <Actions revalidate={revalidate} />
                          </ActionPanel>
                        }
                      />
                    );
                  })}
                </List.Section>
              ) : (
                groupedFavorites.map((group) => {
                  const groupName = group.title;
                  const numberOfFavorites = numberOfFavoritesPerGroup[group.id];

                  return group.favorites && group.favorites.length > 0 ? (
                    <List.Section
                      key={group.id}
                      title={groupName}
                      subtitle={`${numberOfFavorites} ${numberOfFavorites > 1 ? "results" : "result"}`}
                    >
                      {group.favorites?.map((favorite) => {
                        return (
                          <FavoriteItem
                            key={favorite.id}
                            favorite={favorite}
                            revalidate={() => {
                              revalidate();
                              revalidateParent?.();
                            }}
                            group={groupName}
                            removeFromFavorites={removeFromFavorites}
                          />
                        );
                      })}
                    </List.Section>
                  ) : (
                    full == "true" && (
                      <List.EmptyView
                        key={"no-favorites"}
                        title={`No Favorites found in ${group.title}`}
                        description="Add a Favorite"
                        actions={
                          <ActionPanel>
                            <Action.Push
                              title="Add a Favorite"
                              icon={Icon.Star}
                              target={<FavoriteForm add="favorite" groupId={group.id} revalidate={revalidate} />}
                              shortcut={Keyboard.Shortcut.Common.Edit}
                            />
                          </ActionPanel>
                        }
                      />
                    )
                  );
                })
              ))}
            {ungroupedFavorites && (
              <List.Section
                key={"ungrouped"}
                title="Ungrouped"
                subtitle={`${ungroupedFavorites.length} ${ungroupedFavorites.length > 1 ? "results" : "result"}`}
              >
                {ungroupedFavorites.map((favorite) => (
                  <FavoriteItem
                    key={favorite.id}
                    favorite={favorite}
                    revalidate={revalidate}
                    removeFromFavorites={removeFromFavorites}
                  />
                ))}
              </List.Section>
            )}
          </>
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

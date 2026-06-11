import { useMemo, useState } from "react";

import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, LocalStorage } from "@raycast/api";

import { Favorite, Instance } from "../types";

// Augment the tree with pre-lowercased titles once after fetch so the per-keystroke
// filter doesn't re-lowercase every node — same pattern as NavigationMenu.
type IndexedFavorite = Favorite & { _titleLc: string; favorites?: IndexedFavorite[] };

const annotate = (favorites?: Favorite[]): IndexedFavorite[] | undefined => {
  if (!favorites) return undefined;
  const out: IndexedFavorite[] = new Array(favorites.length);
  for (let i = 0; i < favorites.length; i++) {
    const f = favorites[i];
    out[i] = { ...f, _titleLc: (f.title ?? "").toLowerCase(), favorites: annotate(f.favorites) };
  }
  return out;
};
import useInstances from "../hooks/useInstances";
import Actions from "./Actions";
import InstanceForm from "./InstanceForm";
import { filter } from "lodash";
import { getIconForModules } from "../utils/getIconForModules";
import { instanceLabel } from "../utils/instanceLabel";
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
  const { id: instanceId = "", name: instanceName = "", full } = selectedInstance || {};

  const indexedData = useMemo(() => annotate(data), [data]);

  const filterByGroup = useMemo(() => {
    if (!groupId) return indexedData;
    return filter(indexedData, (favorite) => favorite.id === groupId);
  }, [indexedData, groupId]);

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

  // Reference-preserving recursive filter: returns the same subtree reference
  // when nothing was pruned (zero-alloc), shallow-clones only nodes whose
  // children array actually shrank. Tracks which terms are already matched by
  // an ancestor chain so deep matches don't re-check the whole path.
  const filteredData = useMemo(() => {
    if (!filterByGroup) return [];
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return filterByGroup;
    const terms = term.split(" ").filter(Boolean);

    const walk = (favorites: IndexedFavorite[], pathMatches: boolean[]): IndexedFavorite[] | null => {
      let kept: IndexedFavorite[] | null = null;

      for (let i = 0; i < favorites.length; i++) {
        const f = favorites[i];
        const nextPath = pathMatches.slice();
        for (let t = 0; t < terms.length; t++) {
          if (!nextPath[t] && f._titleLc.includes(terms[t])) nextPath[t] = true;
        }
        const selfFullMatch = nextPath.every(Boolean);

        if (!f.favorites || f.favorites.length === 0) {
          if (selfFullMatch) {
            if (kept) kept.push(f);
          } else if (!kept) {
            kept = favorites.slice(0, i);
          }
          continue;
        }

        if (selfFullMatch) {
          if (kept) kept.push(f);
          continue;
        }

        const childResult = walk(f.favorites, nextPath);
        if (childResult === null) {
          if (!kept) kept = favorites.slice(0, i);
        } else if (childResult === f.favorites) {
          if (kept) kept.push(f);
        } else {
          if (!kept) kept = favorites.slice(0, i);
          kept.push({ ...f, favorites: childResult });
        }
      }

      if (kept === null) return favorites;
      return kept.length > 0 ? kept : null;
    };

    const result = walk(filterByGroup, new Array(terms.length).fill(false));
    return result ?? [];
  }, [filterByGroup, searchTerm]);

  const groupedFavorites = useMemo(() => {
    return filter(filteredData, (favorite) => favorite.group);
  }, [filteredData]);

  const ungroupedFavorites = useMemo(() => {
    return filter(filteredData, (favorite) => !favorite.group);
  }, [filteredData]);

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
                            instanceName={instanceName}
                            full={full}
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
                    instanceName={instanceName}
                    full={full}
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

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useFrecencySorting } from "@raycast/utils";
import { formatHours, newTimeEntry, stopTimer, useCompany } from "./services/harvest";
import dayjs from "dayjs";
import { AddFavoriteAction, EditFavoriteAction } from "./addFavoriteForm";
import ListTimeEntries from "./listTimeEntries";

// Favorite interface
export interface Favorite {
  id: string;
  projectId: number;
  projectName: string;
  taskId: number;
  taskName: string;
  clientId: number;
  clientName: string;
  notes?: string;
  hours?: string;
}

const FAVORITES_STORAGE_KEY = "harvest-favorites";

export default function Command() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: company } = useCompany();

  // Use frecency sorting to rank favorites by usage
  const {
    data: sortedFavorites,
    visitItem,
    resetRanking,
  } = useFrecencySorting(favorites, {
    namespace: "harvest-favorites",
    key: (item) => item.id,
  });

  // Load favorites from LocalStorage on mount
  useEffect(() => {
    async function loadFavorites() {
      try {
        const stored = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load favorites:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFavorites();
  }, []);

  // Helper function to update favorites in both state and LocalStorage
  async function updateFavorites(newFavorites: Favorite[]) {
    setFavorites(newFavorites);
    await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
  }

  // Upsert function: adds new favorite or updates existing one
  async function upsertFavorite(favorite: Favorite) {
    const existingIndex = favorites.findIndex((f) => f.id === favorite.id);

    let newFavorites: Favorite[];
    if (existingIndex >= 0) {
      // Update existing favorite
      newFavorites = [...favorites];
      newFavorites[existingIndex] = favorite;
      await showToast({ style: Toast.Style.Success, title: "Favorite Updated" });
    } else {
      // Add new favorite
      newFavorites = [...favorites, favorite];
      await showToast({ style: Toast.Style.Success, title: "Favorite Added" });
    }

    await updateFavorites(newFavorites);
  }

  async function deleteFavorite(favorite: Favorite) {
    if (
      await confirmAlert({
        title: "Delete Favorite",
        message: "Are you sure you want to delete this favorite?",
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const newFavorites = favorites.filter((f: Favorite) => f.id !== favorite.id);
      await updateFavorites(newFavorites);
      await showToast({ style: Toast.Style.Success, title: "Favorite Deleted" });
    }
  }

  async function startTimerOrCreateEntry(favorite: Favorite) {
    const hasDuration = !!favorite.hours;
    const toast = new Toast({
      style: Toast.Style.Animated,
      title: hasDuration ? "Creating Time Entry..." : "Starting Timer...",
    });
    await toast.show();

    try {
      // Only stop running timer if we're starting a new timer (no duration)
      if (!hasDuration) {
        await stopTimer();
      }

      // Create new time entry with today's date
      const param: {
        project_id: number;
        task_id: number;
        spent_date: string;
        notes?: string;
        hours?: string;
      } = {
        project_id: favorite.projectId,
        task_id: favorite.taskId,
        spent_date: dayjs().format("YYYY-MM-DD"),
      };

      if (favorite.notes) {
        param.notes = favorite.notes;
      }

      if (favorite.hours) {
        param.hours = favorite.hours;
      }

      const timeEntry = await newTimeEntry(param);

      // Update frecency ranking when a favorite is used
      await visitItem(favorite);

      await toast.hide();

      if (!hasDuration) {
        // For time entries with duration, we'll navigate to the timesheet
        // The HUD message will be shown after navigation
        await showHUD(timeEntry.is_running ? "Timer Started" : "Time Entry Created");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: hasDuration ? "Could not create time entry" : "Could not start timer",
      });
    }
  }

  const hasFavorites = favorites.length > 0;

  return (
    <List
      searchBarPlaceholder="Filter Favorites"
      isLoading={isLoading}
      navigationTitle="Favorites"
      actions={
        !hasFavorites ? (
          <ActionPanel>
            <AddFavoriteAction onSave={upsertFavorite} />
          </ActionPanel>
        ) : undefined
      }
    >
      {hasFavorites ? (
        <List.Section title="Your Favorites">
          {sortedFavorites.map((favorite) => {
            const hasDuration = !!favorite.hours;
            const actionTitle = hasDuration ? "Create Time Entry" : "Start Timer";

            return (
              <List.Item
                key={favorite.id}
                title={favorite.projectName}
                keywords={favorite.notes?.split(" ")}
                accessories={[
                  ...(hasDuration ? [{ tag: formatHours(favorite.hours, company), icon: Icon.Clock }] : []),

                  { text: `${favorite.clientName} | ${favorite.taskName}` },
                ]}
                subtitle={favorite.notes}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={`${favorite.projectName} | ${favorite.clientName}`}>
                      {hasDuration ? (
                        <Action.Push
                          title={actionTitle}
                          icon={Icon.Clock}
                          target={<ListTimeEntries />}
                          onPush={() => startTimerOrCreateEntry(favorite)}
                        />
                      ) : (
                        <Action
                          title={actionTitle}
                          icon={Icon.Clock}
                          onAction={() => startTimerOrCreateEntry(favorite)}
                        />
                      )}
                      <EditFavoriteAction favorite={favorite} onSave={upsertFavorite} />
                      <Action
                        title="Reset Ranking"
                        icon={Icon.ArrowCounterClockwise}
                        shortcut={{ key: "r", modifiers: ["cmd", "shift"] }}
                        onAction={async () => {
                          await resetRanking(favorite);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Ranking Reset",
                            message: "Favorite ranking has been reset",
                          });
                        }}
                      />
                      <Action
                        title="Delete Favorite"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ key: "x", modifiers: ["ctrl"] }}
                        onAction={() => deleteFavorite(favorite)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Manage Favorites">
                      <AddFavoriteAction onSave={upsertFavorite} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Star, tintColor: Color.SecondaryText }}
          title="No Favorites Yet"
          description="Add your first favorite to quickly start timers"
        />
      )}
    </List>
  );
}

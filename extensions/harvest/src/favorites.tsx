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
import { formatHours, newTimeEntry, stopTimer, useCompany } from "./services/harvest";
import dayjs from "dayjs";
import { AddFavoriteAction } from "./addFavoriteForm";
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
            <AddFavoriteAction onSave={(newFavorite: Favorite) => updateFavorites([...favorites, newFavorite])} />
          </ActionPanel>
        ) : undefined
      }
    >
      {hasFavorites ? (
        <List.Section title="Your Favorites">
          {favorites.map((favorite) => {
            const subtitle = [favorite.notes, favorite.hours ? formatHours(favorite.hours, company) : null]
              .filter(Boolean)
              .join(" | ");

            const hasDuration = !!favorite.hours;
            const actionTitle = hasDuration ? "Create Time Entry" : "Start Timer";

            return (
              <List.Item
                key={favorite.id}
                title={favorite.projectName}
                accessoryTitle={`${favorite.clientName}${favorite.clientName && favorite.taskName ? " | " : ""}${
                  favorite.taskName
                }`}
                subtitle={subtitle || undefined}
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
                      <Action
                        title="Delete Favorite"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ key: "x", modifiers: ["ctrl"] }}
                        onAction={() => deleteFavorite(favorite)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Manage Favorites">
                      <AddFavoriteAction
                        onSave={(newFavorite: Favorite) => updateFavorites([...favorites, newFavorite])}
                      />
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

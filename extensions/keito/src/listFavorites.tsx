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
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useFrecencySorting, usePromise } from "@raycast/utils";
import { AddFavoriteAction, EditFavoriteAction } from "./addFavoriteForm";
import { KeitoGate } from "./components/KeitoGate";
import ListTimeEntries from "./listTimeEntries";
import { primaryShortcut } from "./shortcuts";
import {
  Favorite,
  favoriteAvailability,
  favoritesFrecencyNamespace,
  favoritesKey,
  parseFavorites,
  upsertFavorite as upsertInList,
} from "./services/keito/favorites";
import { ResolvedSession } from "./services/keito/session";
import { assertTaskOnProject, startTimer } from "./services/keito/workflows";
import {
  confirmReplaceRunning,
  formatHours,
  getApi,
  getKeitoPreferences,
  refreshMenuBar,
  showKeitoError,
  todayString,
  useProjects,
} from "./services/useKeito";

function Favorites({ session }: { session: ResolvedSession }) {
  const { push } = useNavigation();
  const key = favoritesKey(session.scope);
  const { titleDisplay = "project" } = getKeitoPreferences();
  const { data: projects, isLoading: isLoadingProjects } = useProjects(session.scope);
  const {
    data: favorites = [],
    isLoading,
    mutate,
  } = usePromise(async (storageKey: string) => parseFavorites(await LocalStorage.getItem<string>(storageKey)), [key]);

  const {
    data: sorted,
    visitItem,
    resetRanking,
  } = useFrecencySorting(favorites, {
    namespace: favoritesFrecencyNamespace(session.scope),
    key: (item) => item.id,
  });

  async function save(next: Favorite[]) {
    await mutate(LocalStorage.setItem(key, JSON.stringify(next)), { optimisticUpdate: () => next });
  }

  async function upsert(favorite: Favorite) {
    const { favorites: next, added } = upsertInList(favorites, favorite);
    await save(next);
    await showToast({ style: Toast.Style.Success, title: added ? "Favorite Added" : "Favorite Updated" });
  }

  async function remove(favorite: Favorite) {
    const confirmed = await confirmAlert({
      title: "Delete Favorite?",
      message: `${favorite.projectName} – ${favorite.taskName}`,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await save(favorites.filter((f) => f.id !== favorite.id));
    await showToast({ style: Toast.Style.Success, title: "Favorite Deleted" });
  }

  async function use(favorite: Favorite) {
    const hasDuration = !!favorite.hours;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: hasDuration ? "Creating time entry…" : "Starting timer…",
    });
    try {
      const api = getApi();
      await assertTaskOnProject(api, favorite, "Edit the favorite to choose another task.");
      if (hasDuration) {
        await api.createTimeEntry({
          project_id: favorite.projectId,
          task_id: favorite.taskId,
          spent_date: todayString(session),
          hours: Number(favorite.hours),
          notes: favorite.notes,
          source: "api",
        });
      } else {
        const result = await startTimer(
          { api, userId: session.identity.userId, confirmReplace: confirmReplaceRunning },
          {
            projectId: favorite.projectId,
            taskId: favorite.taskId,
            spentDate: todayString(session),
            notes: favorite.notes,
          },
        );
        if (result.status === "cancelled") {
          await toast.hide();
          return;
        }
      }
      await visitItem(favorite);
      await toast.hide();
      await refreshMenuBar();
      if (hasDuration) {
        push(<ListTimeEntries />);
      } else {
        await showHUD("Timer Started");
      }
    } catch (error) {
      await toast.hide();
      await showKeitoError(error, hasDuration ? "Could not create the time entry" : "Could not start the timer");
    }
  }

  return (
    <List
      searchBarPlaceholder="Filter favorites"
      isLoading={isLoading || isLoadingProjects}
      actions={
        <ActionPanel>
          <AddFavoriteAction session={session} onSave={upsert} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: Icon.Star, tintColor: Color.SecondaryText }}
        title="No Favorites Yet"
        description={`Press ⌘N to add a favorite for ${session.identity.companyName ?? "this Keito company"}.`}
      />
      <List.Section title="Your Favorites" subtitle={session.identity.companyName}>
        {sorted.map((favorite) => {
          const availability = favoriteAvailability(favorite, isLoadingProjects ? undefined : projects);
          const hasDuration = !!favorite.hours;
          const other = titleDisplay === "task" ? favorite.projectName : favorite.taskName;
          return (
            <List.Item
              key={favorite.id}
              title={titleDisplay === "task" ? favorite.taskName : favorite.projectName}
              subtitle={favorite.notes}
              keywords={[
                ...(favorite.notes?.split(/\s+/) ?? []),
                ...(favorite.clientName?.split(/\s+/) ?? []),
                ...other.split(/\s+/),
              ]}
              icon={
                availability.available
                  ? { source: Icon.Star, tintColor: Color.Yellow }
                  : { source: Icon.Warning, tintColor: Color.Orange }
              }
              accessories={[
                { text: other, icon: Icon.Tag },
                ...(favorite.clientName ? [{ text: favorite.clientName, icon: Icon.Building }] : []),
                ...(hasDuration ? [{ tag: formatHours(Number(favorite.hours)), icon: Icon.Clock }] : []),
                ...(!availability.available
                  ? [{ tag: { value: "Unavailable", color: Color.Orange }, tooltip: availability.reason }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section
                    title={`${favorite.projectName}${favorite.clientName ? ` | ${favorite.clientName}` : ""}`}
                  >
                    {availability.available && (
                      <Action
                        title={hasDuration ? "Create Time Entry" : "Start Timer"}
                        icon={Icon.Clock}
                        onAction={() => use(favorite)}
                      />
                    )}
                    <EditFavoriteAction session={session} favorite={favorite} onSave={upsert} />
                    <Action
                      title="Reset Ranking"
                      icon={Icon.ArrowCounterClockwise}
                      shortcut={primaryShortcut("r", ["shift"])}
                      onAction={async () => {
                        await resetRanking(favorite);
                        await showToast({ style: Toast.Style.Success, title: "Ranking Reset" });
                      }}
                    />
                    <Action
                      title="Delete Favorite"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(favorite)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage Favorites">
                    <AddFavoriteAction session={session} onSave={upsert} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return <KeitoGate>{(session) => <Favorites session={session} />}</KeitoGate>;
}

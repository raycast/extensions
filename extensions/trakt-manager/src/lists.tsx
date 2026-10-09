import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { ListForm } from "./components/list-form";
import { TRAKT_APP_URL } from "./lib/constants";
import { getTraktUrl } from "./lib/helper";
import { deletePersonalList, removeTitleFromList } from "./lib/list-mutations";
import { TraktList, TraktListEntry } from "./lib/schema";
import { fetchAllLists, fetchListItems } from "./tools/list-api";
import { ListItemKind } from "./tools/list-write";

const privacyLabel: Record<string, string> = {
  private: "Private",
  link: "Link",
  friends: "Friends",
  public: "Public",
};

/** What an entry is, its Trakt id for the remove call, and how to show it. */
function describeEntry(entry: TraktListEntry): { kind: ListItemKind; traktId?: number; title: string; icon: Icon } {
  if (entry.movie)
    return { kind: "movies", traktId: entry.movie.ids.trakt, title: entry.movie.title, icon: Icon.FilmStrip };
  if (entry.episode) {
    const code = `S${String(entry.episode.season).padStart(2, "0")}E${String(entry.episode.number).padStart(2, "0")}`;
    return {
      kind: "episodes",
      traktId: entry.episode.ids?.trakt,
      title: `${entry.show?.title ?? ""} ${code}`.trim(),
      icon: Icon.Video,
    };
  }
  if (entry.season) {
    return {
      kind: "seasons",
      traktId: entry.season.ids?.trakt,
      title: `${entry.show?.title ?? ""} Season ${entry.season.number}`.trim(),
      icon: Icon.Layers,
    };
  }
  return { kind: "shows", traktId: entry.show?.ids.trakt, title: entry.show?.title ?? "Untitled", icon: Icon.Monitor };
}

const ListItems = ({ list, onChanged }: { list: TraktList; onChanged: () => void }) => {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (id: string) => (await fetchListItems(id, list.name)).items,
    [String(list.ids.trakt)],
    { failureToastOptions: { title: `Could not read "${list.name}"` } },
  );

  const remove = async (entry: TraktListEntry) => {
    const { kind, traktId, title } = describeEntry(entry);
    if (traktId === undefined) return;
    const confirmed = await confirmAlert({
      title: `Remove "${title}" from "${list.name}"?`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Removing "${title}"` });
    try {
      await removeTitleFromList(list, kind, traktId);
      toast.style = Toast.Style.Success;
      toast.title = `Removed "${title}" from "${list.name}"`;
      revalidate();
      onChanged();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = (error as Error).message;
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle={list.name} searchBarPlaceholder={`Filter "${list.name}"`}>
      <List.EmptyView title="This list is empty" description="Add titles with “Add to List…” from search." />
      {data?.map((entry) => {
        const { title, icon, kind, traktId } = describeEntry(entry);
        const year = entry.movie?.year ?? (kind === "shows" ? entry.show?.year : undefined);
        return (
          <List.Item
            key={entry.id}
            icon={icon}
            title={title}
            subtitle={year?.toString()}
            actions={
              <ActionPanel>
                {traktId !== undefined && (
                  <Action
                    title="Remove from List"
                    icon={Icon.MinusCircle}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(entry)}
                  />
                )}
                {(entry.movie?.ids.slug || entry.show?.ids.slug) && (
                  <Action.OpenInBrowser
                    icon={getFavicon(TRAKT_APP_URL)}
                    title="Open in Trakt"
                    url={
                      entry.movie
                        ? getTraktUrl("movies", entry.movie.ids.slug ?? undefined)
                        : getTraktUrl("shows", entry.show?.ids.slug ?? undefined)
                    }
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default function Command() {
  const { data, isLoading, revalidate, mutate } = useCachedPromise(async () => (await fetchAllLists()).lists, [], {
    failureToastOptions: { title: "Could not read your lists" },
  });

  const remove = async (list: TraktList) => {
    const confirmed = await confirmAlert({
      title: `Delete "${list.name}"?`,
      message: `Its ${list.item_count ?? 0} item(s) are removed with it. This cannot be undone.`,
      primaryAction: { title: "Delete List", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting "${list.name}"` });
    try {
      // Trakt keeps returning a deleted list for a while, so drop it locally instead of reloading.
      await mutate(deletePersonalList(list), {
        optimisticUpdate: (lists) => lists?.filter((other) => other.ids.trakt !== list.ids.trakt),
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Deleted "${list.name}"`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = (error as Error).message;
    }
  };

  const createAction = (
    <Action.Push
      title="Create List"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ListForm onSaved={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter your lists">
      <List.EmptyView icon={Icon.List} title="No personal lists" actions={<ActionPanel>{createAction}</ActionPanel>} />
      {data?.map((list) => (
        <List.Item
          key={list.ids.trakt}
          icon={Icon.List}
          title={list.name}
          subtitle={list.description ?? undefined}
          accessories={[
            { text: `${list.item_count ?? 0} item(s)` },
            { tag: privacyLabel[list.privacy ?? ""] ?? list.privacy ?? "" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Items"
                icon={Icon.Eye}
                target={<ListItems list={list} onChanged={revalidate} />}
              />
              {createAction}
              <Action.Push
                title="Edit List"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<ListForm list={list} onSaved={revalidate} />}
              />
              <Action
                title="Delete List"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => remove(list)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

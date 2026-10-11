import { Action, Alert, Icon, Keyboard, confirmAlert } from "@raycast/api";
import { initTraktClient } from "../lib/client";
import { removeTitleFromHistory } from "../lib/media-mutations";
import { WatchedTarget } from "../lib/media-state";
import { useWatchedState } from "../lib/use-watched";

type TraktClient = ReturnType<typeof initTraktClient>;

type RemoveFromHistoryActionProps<T> = {
  item: T;
  target: WatchedTarget;
  /** Trakt id of the movie, the show or the episode, whichever `target` is. */
  traktId: number;
  title: string;
  client: TraktClient;
  signal: () => AbortSignal | undefined;
  run: (item: T, action: (item: T) => Promise<void>, message: string) => Promise<boolean>;
};

const whatIsRemoved = {
  movie: "every play of this movie",
  show: "every play of every episode",
  episode: "every play of this episode",
};

/**
 * "Remove from History" outside the History screen. Trakt then removes all plays of the title, not one,
 * so the confirmation says so. Hidden once the history is known not to hold the title.
 */
export const RemoveFromHistoryAction = <T,>({
  item,
  target,
  traktId,
  title,
  client,
  signal,
  run,
}: RemoveFromHistoryActionProps<T>) => {
  const { isWatched, setWatched } = useWatchedState();
  if (isWatched(target) === false) return null;

  const remove = async () => {
    const confirmed = await confirmAlert({
      title: `Remove "${title}" from your history?`,
      message: `This removes ${whatIsRemoved[target.type]} from Trakt. It cannot be undone.`,
      primaryAction: { title: "Remove from History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await run(
      item,
      async () => {
        await removeTitleFromHistory(client, target.type, traktId, { signal: signal() });
        setWatched(target, false);
      },
      `Removed "${title}" from history`,
    );
  };

  return (
    <Action
      title="Remove from History"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.Remove}
      onAction={remove}
    />
  );
};

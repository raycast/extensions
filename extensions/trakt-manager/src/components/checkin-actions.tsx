import { Action, Icon } from "@raycast/api";
import { initTraktClient } from "../lib/client";
import { cancelCheckin, fetchActiveCheckin } from "../lib/media-mutations";
import { useCheckinState } from "../lib/use-checkin-state";

type TraktClient = ReturnType<typeof initTraktClient>;

type CheckinActionsProps<T> = {
  item: T;
  /** The Trakt id of the movie or episode this item would check in to. */
  traktId: number;
  title: string;
  client: TraktClient;
  signal: () => AbortSignal | undefined;
  run: (item: T, action: (item: T) => Promise<void>, message: string) => Promise<void>;
  /** Starts the check-in. */
  checkIn: (item: T) => Promise<void>;
};

/**
 * "Now Watching" while nothing is checked in, "Stop Check-In" while something is. A check-in blocks
 * every other one (HTTP 409), so with one active the start action would only fail and is not offered.
 * A component reading the shared check-in state, so a detail view opened earlier stays right.
 */
export const CheckinActions = <T,>({ item, traktId, title, client, signal, run, checkIn }: CheckinActionsProps<T>) => {
  const { active, setActive } = useCheckinState();

  if (active) {
    const isThisItem = active.traktId === traktId;

    return (
      <Action
        title={isThisItem ? "Stop Check-In" : `Stop Check-In (${active.title})`}
        icon={Icon.XMarkCircle}
        onAction={() =>
          run(
            item,
            async () => {
              await cancelCheckin(client, { signal: signal() });
              setActive(null);
            },
            "Check-in stopped",
          )
        }
      />
    );
  }

  return (
    <Action
      title="Now Watching"
      icon={Icon.Play}
      onAction={() =>
        run(
          item,
          async (current) => {
            await checkIn(current);
            // The expiry comes from Trakt, so read it back rather than guess the runtime.
            setActive(await fetchActiveCheckin(client, { signal: signal() }));
          },
          `Now watching "${title}"`,
        )
      }
    />
  );
};

import { Action, Icon } from "@raycast/api";
import { initTraktClient } from "../lib/client";
import { cancelCheckin, fetchActiveCheckin } from "../lib/media-mutations";
import { useCheckinState } from "../lib/use-checkin-state";

type TraktClient = ReturnType<typeof initTraktClient>;

/** Used only when Trakt's expiry could not be read back; "Stop Check-In" works whatever the expiry. */
const FALLBACK_CHECKIN_MS = 4 * 60 * 60 * 1000;

type CheckinActionsProps<T> = {
  item: T;
  /** Whether this item checks in to a movie or an episode. */
  type: "movie" | "episode";
  /** The Trakt id of the movie or episode this item would check in to. */
  traktId: number;
  title: string;
  client: TraktClient;
  signal: () => AbortSignal | undefined;
  run: (item: T, action: (item: T) => Promise<void>, message: string) => Promise<boolean>;
  /** Starts the check-in. */
  checkIn: (item: T) => Promise<void>;
};

/**
 * "Now Watching" while nothing is checked in, "Stop Check-In" while something is. A check-in blocks
 * every other one (HTTP 409), so with one active the start action would only fail and is not offered.
 * A component reading the shared check-in state, so a detail view opened earlier stays right.
 */
export const CheckinActions = <T,>({
  item,
  type,
  traktId,
  title,
  client,
  signal,
  run,
  checkIn,
}: CheckinActionsProps<T>) => {
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
            // The expiry comes from Trakt, so read it back. The check-in already succeeded: if that
            // read fails, keep it active until a later read corrects the expiry, rather than report
            // a failure and offer "Now Watching" again, which Trakt would refuse with a 409.
            try {
              setActive(await fetchActiveCheckin(client, { signal: signal() }));
            } catch {
              setActive({ type, traktId, title, expiresAt: new Date(Date.now() + FALLBACK_CHECKIN_MS).toISOString() });
            }
          },
          `Now watching "${title}"`,
        )
      }
    />
  );
};

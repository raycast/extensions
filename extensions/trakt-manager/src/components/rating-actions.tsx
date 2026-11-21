import { Action, ActionPanel, Alert, Icon, Keyboard, confirmAlert } from "@raycast/api";
import { initTraktClient } from "../lib/client";
import { rateTitle, unrateTitle } from "../lib/media-mutations";
import { RatedType } from "../lib/media-state";
import { useRatingState } from "../lib/use-ratings";

type TraktClient = ReturnType<typeof initTraktClient>;

const RATE_SHORTCUT = {
  macOS: { modifiers: ["cmd", "shift"], key: "r" },
  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
} satisfies Keyboard.Shortcut;

const SCORES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

type RatingActionsProps<T> = {
  item: T;
  type: RatedType;
  traktId: number;
  title: string;
  client: TraktClient;
  signal: () => AbortSignal | undefined;
  run: (item: T, action: (item: T) => Promise<void>, message: string) => Promise<boolean>;
};

/**
 * "Rate…" (1–10, the current score checked) and "Remove Rating", as on Trakt Web. A component, so the label
 * follows the shared ratings in a detail view opened before the change. While the ratings are unknown,
 * "Remove Rating" stays offered, as the watchlist actions do.
 */
export const RatingActions = <T,>({ item, type, traktId, title, client, signal, run }: RatingActionsProps<T>) => {
  const { known, ratingOf, setRating } = useRatingState();
  const current = ratingOf(type, traktId);

  const rate = (score: number) =>
    run(
      item,
      async () => {
        await rateTitle(client, type, traktId, score, { signal: signal() });
        setRating(type, traktId, score);
      },
      `Rated "${title}" ${score}/10`,
    );

  const removeRating = async () => {
    const confirmed = await confirmAlert({
      title: `Remove your rating of "${title}"?`,
      message: current ? `Your ${current}/10 is removed from Trakt.` : undefined,
      primaryAction: { title: "Remove Rating", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await run(
      item,
      async () => {
        await unrateTitle(client, type, traktId, { signal: signal() });
        setRating(type, traktId, undefined);
      },
      `Removed the rating of "${title}"`,
    );
  };

  return (
    <>
      <ActionPanel.Submenu
        title={current ? `Rate… (${current}/10)` : "Rate…"}
        icon={Icon.Star}
        shortcut={RATE_SHORTCUT}
      >
        {SCORES.map((score) => (
          <Action
            key={score}
            title={`${score}/10`}
            icon={score === current ? Icon.CheckCircle : Icon.Circle}
            onAction={() => rate(score)}
          />
        ))}
      </ActionPanel.Submenu>
      {(current !== undefined || !known) && (
        <Action
          title="Remove Rating"
          icon={Icon.StarDisabled}
          style={Action.Style.Destructive}
          onAction={removeRating}
        />
      )}
    </>
  );
};

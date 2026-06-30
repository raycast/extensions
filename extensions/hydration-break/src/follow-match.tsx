import {
  Action,
  ActionPanel,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import {
  EspnEvent,
  kickoffLocal,
  minuteFromClock,
  scoreboardUrl,
  scoreLine,
  WORLD_CUP_LEAGUE,
  WORLD_CUP_TITLE,
} from "./espn";
import { getFollowedMatch, followMatch, unfollowMatch } from "./match";

const STATE_ORDER: Record<string, number> = { in: 0, pre: 1, post: 2 };
const NO_MATCH_SUBTITLE = "Pick a World Cup match";

/** Re-run the menu-bar command so it reflects the new clock source immediately. */
async function refreshMenuBar() {
  try {
    await launchCommand({ name: "hydration-break", type: LaunchType.Background });
  } catch {
    // Menu bar command may be disabled; ignore.
  }
}

/** "NOR @ CIV · Today 18:00" (scheduled) or "NOR @ CIV · 23'" (live). */
function followSubtitle(label: string, event: EspnEvent | null, now: number): string {
  if (!event) return `Following ${label}`;
  const state = event.status.type.state;
  if (state === "in") {
    const minute = minuteFromClock(event.status.displayClock);
    return `${label} · ${minute !== null ? `${minute}'` : "live"}`;
  }
  if (state === "pre") {
    const kickoff = kickoffLocal(event.date, now);
    return kickoff ? `${label} · ${kickoff}` : `Following ${label}`;
  }
  return `${label} · ended`;
}

export default function FollowMatch() {
  const { pop } = useNavigation();
  const now = Date.now();

  const { isLoading, data, revalidate } = useFetch(scoreboardUrl(WORLD_CUP_LEAGUE), {
    parseResponse: async (res) => {
      if (!res.ok) throw new Error(`ESPN request failed (${res.status})`);
      const json = (await res.json()) as { events?: EspnEvent[] };
      return [...(json.events ?? [])].sort(
        (a, b) => (STATE_ORDER[a.status.type.state] ?? 9) - (STATE_ORDER[b.status.type.state] ?? 9),
      );
    },
    failureToastOptions: { title: "Couldn't reach ESPN" },
  });

  // Reflect the currently-followed match (and its time) in this command's subtitle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const followed = await getFollowedMatch();
      if (cancelled) return;
      if (!followed) {
        await updateCommandMetadata({ subtitle: NO_MATCH_SUBTITLE });
        return;
      }
      const event = (data ?? []).find((e) => e.id === followed.id) ?? null;
      await updateCommandMetadata({ subtitle: followSubtitle(followed.label, event, now) });
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <List isLoading={isLoading} navigationTitle={`${WORLD_CUP_TITLE} — pick a match to follow`}>
      <List.Section title="Clock source">
        <List.Item
          icon={Icon.Calendar}
          title="Use the daily schedule"
          subtitle="Stop following a real match"
          actions={
            <ActionPanel>
              <Action
                title="Use Daily Schedule"
                icon={Icon.Calendar}
                onAction={async () => {
                  await unfollowMatch();
                  await updateCommandMetadata({ subtitle: NO_MATCH_SUBTITLE });
                  await refreshMenuBar();
                  await showToast({ style: Toast.Style.Success, title: "Using daily schedule" });
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`${WORLD_CUP_TITLE} — today`}>
        {(data ?? []).map((event) => {
          const state = event.status.type.state;
          const isLive = state === "in";
          const minute = minuteFromClock(event.status.displayClock);
          const kickoff = kickoffLocal(event.date, now);
          const subtitle =
            state === "in"
              ? `${minute !== null ? `${minute}'` : event.status.type.shortDetail} · ${scoreLine(event) ?? "live"}`
              : state === "pre" && kickoff
                ? `Kicks off ${kickoff}`
                : event.status.type.shortDetail;

          return (
            <List.Item
              key={event.id}
              icon={isLive ? { source: Icon.Dot, tintColor: Color.Green } : Icon.Clock}
              title={event.shortName}
              subtitle={subtitle}
              accessories={
                isLive
                  ? [{ tag: { value: "LIVE", color: Color.Green } }]
                  : state === "pre" && kickoff
                    ? [{ text: kickoff }]
                    : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Follow This Match"
                    icon={Icon.Raindrop}
                    onAction={async () => {
                      await followMatch({ id: event.id, league: WORLD_CUP_LEAGUE, label: event.shortName });
                      await updateCommandMetadata({ subtitle: followSubtitle(event.shortName, event, now) });
                      await refreshMenuBar();
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Following ${event.shortName}`,
                        message: "Hydration breaks fire at 22' and 67'",
                      });
                      pop();
                    }}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

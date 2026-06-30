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
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { EspnEvent, minuteFromClock, scoreboardUrl, scoreLine, WORLD_CUP_LEAGUE, WORLD_CUP_TITLE } from "./espn";
import { followMatch, unfollowMatch } from "./match";

const STATE_ORDER: Record<string, number> = { in: 0, pre: 1, post: 2 };

/** Re-run the menu-bar command so it reflects the new clock source immediately. */
async function refreshMenuBar() {
  try {
    await launchCommand({ name: "hydration-break", type: LaunchType.Background });
  } catch {
    // Menu bar command may be disabled; ignore.
  }
}

export default function FollowMatch() {
  const { pop } = useNavigation();

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
          const subtitle =
            state === "in"
              ? `${minute !== null ? `${minute}'` : event.status.type.shortDetail} · ${scoreLine(event) ?? "live"}`
              : event.status.type.shortDetail;

          return (
            <List.Item
              key={event.id}
              icon={isLive ? { source: Icon.Dot, tintColor: Color.Green } : Icon.Clock}
              title={event.shortName}
              subtitle={subtitle}
              accessories={isLive ? [{ tag: { value: "LIVE", color: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title="Follow This Match"
                    icon={Icon.Raindrop}
                    onAction={async () => {
                      await followMatch({ id: event.id, league: WORLD_CUP_LEAGUE, label: event.shortName });
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

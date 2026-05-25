import { Action, ActionPanel, Color, getApplications, Icon, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { KLACK_BUNDLE_ID } from "./lib/constants";
import { reportError } from "./lib/errors";
import { fmtCount, getStats, NF, statsToMarkdown, type Stats } from "./lib/stats";
import { iconForSwitch, tagTintForSwitch, tintForSwitch } from "./lib/switch-display";

const POLL_INTERVAL_MS = 1000;

async function openKlack() {
  const apps = await getApplications();
  const klack = apps.find((a) => a.bundleId === KLACK_BUNDLE_ID);
  if (klack) await open(klack.path);
}

const TOTAL_ROWS = [
  { title: "Keystrokes", icon: Icon.Keyboard, key: "keystrokes" as const },
  { title: "Dings", icon: Icon.Bell, key: "dings" as const },
  { title: "Clicks", icon: Icon.Mouse, key: "clicks" as const },
];

function formatTrackingSince(d: Date): string {
  return `Tracking since ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function StatsActions({ stats, revalidate }: { stats: Stats; revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Stats as Markdown"
        icon={Icon.CopyClipboard}
        content={statsToMarkdown(stats)}
      />
      <Action
        title="Refresh"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getStats, [], { keepPreviousData: true });

  useEffect(() => {
    let inflight = false;
    const id = setInterval(async () => {
      if (inflight) return;
      inflight = true;
      try {
        await revalidate();
      } finally {
        inflight = false;
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [revalidate]);

  useEffect(() => {
    if (error) void reportError(error);
  }, [error]);

  const blocked = data && (!data.enabled || !data.hasPermission);
  const totalsTitle =
    !blocked && data?.trackingSince ? `Total Usage · ${formatTrackingSince(data.trackingSince)}` : "Total Usage";

  return (
    <List isLoading={isLoading} navigationTitle="Klack Stats">
      {blocked && !data.enabled && (
        <List.EmptyView
          icon={{ source: Icon.EyeDisabled, tintColor: Color.SecondaryText }}
          title="Stats tracking is off"
          description="Turn on Stats in Klack → Settings → Stats to start collecting data."
          actions={
            <ActionPanel>
              <Action title="Open Klack" icon={Icon.AppWindow} onAction={openKlack} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {blocked && data.enabled && !data.hasPermission && (
        <List.EmptyView
          icon={{ source: Icon.Lock, tintColor: Color.Yellow }}
          title="Permission required"
          description="Klack needs Accessibility permission to track stats. Grant it in System Settings → Privacy & Security → Accessibility."
          actions={
            <ActionPanel>
              <Action
                title="Open Accessibility Settings"
                icon={Icon.Gear}
                onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")}
              />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {data && !blocked && (
        <>
          <List.Section title={totalsTitle}>
            {TOTAL_ROWS.map((r) => (
              <List.Item
                key={r.key}
                title={r.title}
                icon={r.icon}
                accessories={[{ text: fmtCount(data[r.key]) }]}
                actions={<StatsActions stats={data} revalidate={revalidate} />}
              />
            ))}
          </List.Section>
          <List.Section title="Favourite Switches">
            {data.switches.map((s) => {
              const file = iconForSwitch(s.name);
              return (
                <List.Item
                  key={s.name}
                  title={s.name}
                  icon={file ? { source: file } : { source: Icon.PlusSquare, tintColor: tintForSwitch(s.name) }}
                  accessories={[
                    { tag: { value: NF.format(s.count), color: tagTintForSwitch(s.name) as Color.ColorLike } },
                  ]}
                  actions={<StatsActions stats={data} revalidate={revalidate} />}
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}

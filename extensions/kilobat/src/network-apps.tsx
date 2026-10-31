import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { appCard, noticeCard, NARROW, staleCard } from "./cards";
import { ErrorView, KilobatAppAction } from "./components";
import { image } from "./draw";
import { formatBytes, formatRate, kilobat, NetworkApp, Status } from "./kilobat";

const ACTIVE = 512; // bytes per second that count as using the network
const KEEP = 60; // samples of history per row: two minutes at one poll every two seconds

type History = Map<string, { down: number[]; up: number[] }>;
const push = (values: number[], value: number) => [...values, value].slice(-KEEP);
const rate = (app: NetworkApp) => app.downloadBytesPerSecond + app.uploadBytesPerSecond;

/** Helpers under the app they belong to, as the app's list shows them. */
function group(apps: NetworkApp[], grouped: boolean): NetworkApp[] {
  if (!grouped) return apps;
  const groups = new Map<string, NetworkApp>();
  for (const app of apps) {
    const id = app.groupID ?? app.id;
    const existing = groups.get(id);
    if (!existing) {
      groups.set(id, {
        ...app,
        id,
        name: app.groupName ?? app.name,
        bundlePath: app.groupPath ?? app.bundlePath,
        processIDs: [...app.processIDs],
        members: [app],
      });
    } else {
      existing.downloadBytesPerSecond += app.downloadBytesPerSecond;
      existing.uploadBytesPerSecond += app.uploadBytesPerSecond;
      existing.sessionBytes += app.sessionBytes;
      existing.processIDs = [...new Set([...existing.processIDs, ...app.processIDs])];
      existing.members = [...(existing.members ?? []), app];
    }
  }
  return [...groups.values()];
}

export default function Command() {
  const [apps, setApps] = useState<NetworkApp[]>();
  const [error, setError] = useState<Error>();
  const [updated, setUpdated] = useState<Date>();
  const [attempt, setAttempt] = useState(0);
  const [grouped, setGrouped] = useState(true);
  const history = useRef<History>(new Map());

  useEffect(() => {
    let stopped = false;
    let timer: NodeJS.Timeout | undefined;
    const poll = async () => {
      try {
        const status = await kilobat<Status>(["status", "--json"], 15_000);
        if (stopped) return;
        const record = (id: string, down: number, up: number) => {
          const past = history.current.get(id) ?? { down: [], up: [] };
          history.current.set(id, { down: push(past.down, down), up: push(past.up, up) });
        };
        let down = 0,
          up = 0;
        for (const app of status.apps) {
          record(app.id, app.downloadBytesPerSecond, app.uploadBytesPerSecond);
          down += app.downloadBytesPerSecond;
          up += app.uploadBytesPerSecond;
        }
        for (const owner of group(status.apps, true))
          if (owner.members && owner.members.length > 1)
            record(owner.id, owner.downloadBytesPerSecond, owner.uploadBytesPerSecond);
        record("mac", down, up);
        setApps(status.apps);
        setError(undefined);
        setUpdated(new Date());
      } catch (caught) {
        if (stopped) return;
        setError(caught as Error);
      }
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  if (error && !apps) return <ErrorView error={error} onRetry={() => setAttempt(attempt + 1)} />;

  if (!apps) {
    return (
      <Detail
        isLoading
        markdown={image(
          noticeCard("Network apps", "Listening to every app's traffic for a moment…", { tagText: "Listening" }),
          700,
        )}
      />
    );
  }

  const rows = group(apps, grouped).sort((a, b) => rate(b) - rate(a) || b.sessionBytes - a.sessionBytes);
  const active = rows.filter((app) => rate(app) >= ACTIVE);
  const quiet = rows.filter((app) => rate(app) < ACTIVE);
  const total = apps.reduce(
    (sum, app) => ({ down: sum.down + app.downloadBytesPerSecond, up: sum.up + app.uploadBytesPerSecond }),
    { down: 0, up: 0 },
  );

  const item = (app: NetworkApp) => {
    const past = history.current.get(app.id) ?? { down: [], up: [] };
    const now = rate(app);
    const count = app.processIDs.length;
    const subtitle = `${now >= 1 ? formatRate(now) : "Idle"} · ${count} process${count === 1 ? "" : "es"}`;
    return (
      <List.Item
        key={app.id}
        title={app.name}

        icon={
          app.id === "mac"
            ? { source: "kilobat.png" }
            : app.bundlePath
              ? { fileIcon: app.bundlePath }
              : { source: Icon.Terminal, tintColor: Color.SecondaryText }
        }
        keywords={[app.id, ...(app.members ?? []).map((member) => member.name)]}
        accessories={[
          now >= ACTIVE
            ? { text: { value: formatRate(now), color: Color.Blue }, tooltip: subtitle }
            : {
                text: { value: formatBytes(app.sessionBytes), color: Color.SecondaryText },
                tooltip: `Idle · ${formatBytes(app.sessionBytes)} this session`,
              },
        ]}
        detail={<List.Item.Detail markdown={image(appCard(app, past.down, past.up), NARROW, app.name)} />}
        actions={
          <ActionPanel>
            <KilobatAppAction title="See History in Kilobat" link="open/history" />
            <Action
              title={grouped ? "Show Every Process" : "Group by App"}
              icon={grouped ? Icon.List : Icon.AppWindowGrid2x2}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => setGrouped(!grouped)}
            />
            <Action.CopyToClipboard title="Copy Name" content={app.name} />
            {app.processIDs.length ? (
              <Action.CopyToClipboard
                title="Copy Process IDs"
                content={app.processIDs.join(" ")}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Find an app or process…"
      navigationTitle={
        error ? "Not updating · last reading shown" : `↓ ${formatRate(total.down)}  ↑ ${formatRate(total.up)}`
      }
    >
      {error ? (
        // When a refresh fails, the last reading stays, labelled as old rather than shown as live.
        <List.Section title="Not updating">
          <List.Item
            title="Kilobat stopped answering"
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            detail={<List.Item.Detail markdown={image(staleCard(error, updated, NARROW), NARROW, "Not updating")} />}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setAttempt(attempt + 1)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section title="This Mac">
        {item({
          id: "mac",
          name: "All traffic",
          downloadBytesPerSecond: total.down,
          uploadBytesPerSecond: total.up,
          sessionBytes: apps.reduce((sum, app) => sum + app.sessionBytes, 0),
          processIDs: [],
        })}
      </List.Section>
      <List.Section title="Using the network" subtitle={String(active.length)}>
        {active.map(item)}
      </List.Section>
      <List.Section title="Idle" subtitle={String(quiet.length)}>
        {quiet.map(item)}
      </List.Section>
    </List>
  );
}

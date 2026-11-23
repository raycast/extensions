import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Item, NotInstalledError, Result, brewCommand, downloadURL, gb, ramback } from "./ramback";

const icons: Record<string, Icon> = {
  simulator: Icon.Mobile,
  simulatorApp: Icon.Mobile,
  emulator: Icon.Mobile,
  gradle: Icon.Hammer,
  kotlin: Icon.Hammer,
  xcode: Icon.Hammer,
  bundler: Icon.Bolt,
  docker: Icon.Box,
  container: Icon.Box,
  database: Icon.HardDrive,
  tunnel: Icon.Network,
  server: Icon.Globe,
  agent: Icon.Stars,
};

/** Section titles for rows without a project, as the app and CLI name them (Item.Kind.group in RambackCore). */
const kindTitles: Record<string, string> = {
  simulator: "Simulators",
  simulatorApp: "Simulators",
  emulator: "Android",
  gradle: "Gradle & Kotlin",
  kotlin: "Gradle & Kotlin",
  xcode: "Xcode",
  bundler: "Bundlers",
  docker: "Docker",
  container: "Docker",
  database: "Databases",
  tunnel: "Tunnels",
  server: "Dev servers",
  agent: "Agents",
};

export default function Running() {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    const result = await ramback("status", "--json");
    // `status --json` always exits 0; anything else is a usage error or a crash, so show what it said.
    if (result.code !== 0) {
      throw new Error((result.stderr || result.stdout).trim() || `ramback exited with code ${result.code}`);
    }
    return JSON.parse(result.stdout) as Item[];
  });
  const groups = new Map<string, Item[]>();
  for (const item of [...data].sort((a, b) => b.memory - a.memory)) {
    const group = item.project ?? kindTitles[item.kind] ?? item.kind;
    groups.set(group, [...(groups.get(group) ?? []), item]);
  }
  return (
    <List isLoading={isLoading}>
      {error instanceof NotInstalledError ? (
        <List.EmptyView
          icon={Icon.Download}
          title="Ramback isn't installed"
          description="This extension runs the ramback tool that comes with the free Ramback app."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download Ramback" url={downloadURL} />
              <Action.CopyToClipboard title="Copy Homebrew Command" content={brewCommand} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't read Ramback's status"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView icon={Icon.CheckCircle} title="Nothing running" />
      )}
      {[...groups].map(([group, items]) => (
        <List.Section key={group} title={group}>
          {items.map((item) => (
            <Row key={item.id} item={item} onStop={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function Row({ item, onStop }: { item: Item; onStop: () => void }) {
  const web = ["server", "bundler"].includes(item.kind) && item.ports.length > 0;
  const url = web ? `http://localhost:${item.ports[0]}` : undefined;
  return (
    <List.Item
      title={item.title}
      subtitle={item.startedBy && `started by ${item.startedBy}`}
      icon={icons[item.kind] ?? Icon.Dot}
      accessories={[
        ...(item.building ? [{ tag: { value: "building", color: Color.Orange } }] : []),
        ...(item.guarded ? [{ tag: "guarded" }] : []),
        { text: gb(item.memory) },
      ]}
      actions={
        <ActionPanel>
          {item.stop !== undefined && (
            <Action
              title="Stop"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => stop(item, onStop).then(onStop)}
            />
          )}
          {url && <Action.OpenInBrowser url={url} />}
          {url && <Action.CopyToClipboard title="Copy URL" content={url} />}
        </ActionPanel>
      }
    />
  );
}

/** Stops politely; asks before a pinned row or a database, and offers Force Stop when something holds on. */
async function stop(item: Item, onStop: () => void, ...flags: string[]): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Stopping ${item.title}` });
  let result: Result;
  try {
    result = await ramback("stop", item.id, ...flags);
  } catch (error) {
    // The CLI is gone (Ramback was removed) or couldn't start: don't leave the toast spinning.
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't stop ${item.title}`;
    toast.message = error instanceof Error ? error.message : String(error);
    return;
  }
  if (result.code === 3) {
    await toast.hide();
    const confirmed = await confirmAlert({
      title: `Stop ${item.title}?`,
      message: "It's pinned in Ramback or a database.",
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    return confirmed ? stop(item, onStop, "--yes") : undefined;
  }
  if (result.code === 0) {
    toast.style = Toast.Style.Success;
    toast.title = `Stopped ${item.title}`;
    return;
  }
  toast.style = Toast.Style.Failure;
  toast.title = `Couldn't stop ${item.title}`;
  toast.message = (result.stdout || result.stderr).trim();
  if (result.code === 1) {
    toast.primaryAction = { title: "Force Stop", onAction: () => stop(item, onStop, "--yes", "--force").then(onStop) };
  }
}

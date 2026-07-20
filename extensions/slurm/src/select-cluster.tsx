import { Action, ActionPanel, Color, Icon, List, Toast, showToast, updateCommandMetadata } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  addActiveHost,
  getActiveHosts,
  listHosts,
  removeActiveHost,
  type ConfigState,
  type Host,
} from "./lib/ssh-config";
import { closeMaster, isMasterUp, openMaster, openMasterInTerminal, SshAuthError } from "./lib/ssh";
import { showSshErrorToast } from "./lib/errors";

export default function SelectCluster() {
  const { data, isLoading: hostsLoading, revalidate } = useCachedPromise(listHosts, [], { keepPreviousData: true });
  const hosts = data?.hosts ?? [];
  const configState = data?.state;

  const { data: active, revalidate: reloadActive } = useCachedPromise(getActiveHosts, [], {
    keepPreviousData: true,
  });

  const activeSet = new Set(active ?? []);
  const knownNames = new Set(hosts.map((h) => h.name));
  const staleActive = (active ?? []).filter((a) => !knownNames.has(a));

  async function syncSubtitle() {
    const cur = await getActiveHosts();
    await updateCommandMetadata({ subtitle: cur.length ? cur.join(", ") : "" });
  }

  async function toggle(host: Host) {
    if (activeSet.has(host.name)) {
      await removeActiveHost(host.name);
      await syncSubtitle();
      await reloadActive();
      await showToast({
        style: Toast.Style.Success,
        title: `Deselected ${host.name}`,
        message: "Connection kept running",
      });
      return;
    }

    await addActiveHost(host.name);
    await syncSubtitle();
    await reloadActive();

    if (await isMasterUp(host.name)) {
      await showToast({
        style: Toast.Style.Success,
        title: `Activated ${host.name}`,
        message: "Connection already up",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Connecting to ${host.name}…` });
    try {
      await openMaster(host.name);
      toast.style = Toast.Style.Success;
      toast.title = `Connected: ${host.name}`;
    } catch (err) {
      if (err instanceof SshAuthError) {
        toast.style = Toast.Style.Success;
        toast.title = `Auth required — opening Terminal for ${host.name}`;
        await openMasterInTerminal(host.name);
      } else {
        await toast.hide();
        await showSshErrorToast(err, host.name, `Connecting to ${host.name}`);
      }
    }
  }

  async function dropStale(name: string) {
    await removeActiveHost(name);
    await syncSubtitle();
    await reloadActive();
    await showToast({
      style: Toast.Style.Success,
      title: `Removed stale entry: ${name}`,
      message: "It was no longer in ~/.ssh/config.",
    });
  }

  // Sort: active first (in their persisted order), then the rest alphabetically.
  const sorted = sortHosts(hosts, active ?? []);

  if (!hostsLoading && configState && configState.kind !== "ok") {
    return (
      <List isLoading={hostsLoading} searchBarPlaceholder="Filter clusters…" navigationTitle="Select Clusters">
        <ConfigStateEmptyView state={configState} onReload={() => revalidate()} />
      </List>
    );
  }

  return (
    <List
      isLoading={hostsLoading}
      searchBarPlaceholder="Filter clusters…"
      navigationTitle={(active ?? []).length > 0 ? `Select Clusters — ${(active ?? []).join(", ")}` : "Select Clusters"}
    >
      {sorted.length === 0 && staleActive.length === 0 ? (
        <List.EmptyView
          title="No hosts found"
          description="Add at least one Host entry to ~/.ssh/config."
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <>
          {staleActive.length > 0 ? (
            <List.Section title={`Stale (${staleActive.length})`}>
              {staleActive.map((name) => (
                <StaleHostItem key={name} name={name} onRemove={() => dropStale(name)} />
              ))}
            </List.Section>
          ) : null}
          <List.Section title={`Active (${(active ?? []).filter((a) => knownNames.has(a)).length})`}>
            {sorted
              .filter((h) => activeSet.has(h.name))
              .map((h) => (
                <ClusterItem
                  key={h.name}
                  host={h}
                  isActive
                  onToggle={() => toggle(h)}
                  onReload={() => revalidate()}
                  onRefreshActive={async () => {
                    await syncSubtitle();
                    await reloadActive();
                  }}
                />
              ))}
          </List.Section>
          <List.Section title="Available">
            {sorted
              .filter((h) => !activeSet.has(h.name))
              .map((h) => (
                <ClusterItem
                  key={h.name}
                  host={h}
                  isActive={false}
                  onToggle={() => toggle(h)}
                  onReload={() => revalidate()}
                  onRefreshActive={async () => {
                    await syncSubtitle();
                    await reloadActive();
                  }}
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function ConfigStateEmptyView({ state, onReload }: { state: ConfigState; onReload: () => void }) {
  const reloadAction = (
    <ActionPanel>
      <Action title="Reload" icon={Icon.ArrowClockwise} onAction={onReload} />
    </ActionPanel>
  );

  if (state.kind === "missing") {
    return (
      <List.EmptyView
        title="No ~/.ssh/config"
        description={`Create ${state.path} with at least one Host entry to start.`}
        icon={{ source: Icon.Document, tintColor: Color.Orange }}
        actions={reloadAction}
      />
    );
  }
  if (state.kind === "unreadable") {
    return (
      <List.EmptyView
        title="Couldn't read ~/.ssh/config"
        description={state.reason}
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        actions={reloadAction}
      />
    );
  }
  // empty
  return (
    <List.EmptyView
      title="No hosts in ~/.ssh/config"
      description="The file exists but contains no Host entries."
      icon={Icon.MagnifyingGlass}
      actions={reloadAction}
    />
  );
}

function StaleHostItem({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <List.Item
      title={name}
      subtitle="No longer in ~/.ssh/config"
      icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
      accessories={[{ tag: { value: "Stale", color: Color.Orange } }]}
      actions={
        <ActionPanel>
          <Action
            title="Remove from Active List"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onRemove}
          />
        </ActionPanel>
      }
    />
  );
}

function sortHosts(hosts: Host[], active: string[]): Host[] {
  const order = new Map<string, number>();
  active.forEach((h, i) => order.set(h, i));
  return [...hosts].sort((a, b) => {
    const ai = order.has(a.name) ? order.get(a.name)! : Number.POSITIVE_INFINITY;
    const bi = order.has(b.name) ? order.get(b.name)! : Number.POSITIVE_INFINITY;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function ClusterItem({
  host,
  isActive,
  onToggle,
  onReload,
  onRefreshActive,
}: {
  host: Host;
  isActive: boolean;
  onToggle: () => void;
  onReload: () => void;
  onRefreshActive: () => void;
}) {
  const { data: masterUp, revalidate: recheckMaster } = useCachedPromise(
    (name: string) => isMasterUp(name),
    [host.name],
    { keepPreviousData: true },
  );

  async function forceTerminal() {
    await openMasterInTerminal(host.name);
    await addActiveHost(host.name);
    await onRefreshActive();
    recheckMaster();
  }

  async function closeAndDeselect() {
    await closeMaster(host.name);
    await removeActiveHost(host.name);
    await onRefreshActive();
    await showToast({ style: Toast.Style.Success, title: `Connection closed: ${host.name}` });
    recheckMaster();
  }

  const accessories: List.Item.Accessory[] = [];
  if (isActive) accessories.push({ tag: { value: "Active", color: Color.Green } });
  if (masterUp) accessories.push({ icon: { source: Icon.Dot, tintColor: Color.Green }, tooltip: "Connection running" });
  if (host.user) accessories.push({ tag: { value: host.user, color: Color.SecondaryText } });
  accessories.push({ text: host.hostName });

  return (
    <List.Item
      title={host.name}
      icon={
        isActive
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={isActive ? "Deselect (Keep Connection Running)" : "Activate & Connect"}
            icon={isActive ? Icon.MinusCircle : Icon.Plug}
            onAction={onToggle}
          />
          <Action
            title="Open in Terminal (Interactive)"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={forceTerminal}
          />
          <Action
            title="Close Connection & Deselect"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={closeAndDeselect}
          />
          <Action
            title="Reload SSH Config"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onReload}
          />
          <Action.CopyToClipboard
            title="Copy Host Alias"
            content={host.name}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

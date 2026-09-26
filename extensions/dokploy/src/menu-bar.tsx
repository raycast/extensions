import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import { Instance, instanceId } from "./instances";
import { ServerHealth, diskPercent, fetchServerHealth, formatGB } from "./server-health";
import { mapWithConcurrency } from "./concurrency";

type HealthState = { kind: "loading" } | { kind: "loaded"; health: ServerHealth } | { kind: "error"; message: string };

async function openCommand(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch {
    // Command not found/disabled - nothing sensible to do from a menu bar action.
  }
}

/**
 * Menu bar server health/disk status for every configured instance, without opening Raycast's main
 * window. A new `docker.getServerHealth` call (confirmed live to work over the plain REST bridge)
 * gives disk/memory/container counts with no opt-in Dokploy monitoring setup required, unlike
 * `server.getServerMetrics`.
 *
 * Only disk usage drives the "needs attention" icon tint: CPU spikes are normal and self-resolve,
 * but a full disk takes services down and doesn't recover on its own.
 *
 * Per-service quick actions (deploy/restart/etc. straight from the menu bar) were tried and dropped:
 * a `MenuBarExtra.Item`'s `onAction` can't reliably finish async work of its own (Raycast documents
 * that clicking a menu item closes the menu, and the command "unloads... once the menu is closed" -
 * live-tested and confirmed this kills an in-flight `fetch` before it completes). The two ways
 * around that - a separate helper command, or a deeplink back into this same command - both still
 * leave a second command permanently listed in search (Raycast has no way to hide one, confirmed
 * against the actual extension.json schema) or show a mandatory "triggered outside of Raycast"
 * confirmation dialog on every click, so the account owner chose to drop quick actions rather than
 * accept either trade-off. `Deploy Service`/`Deployments` already cover that need from an open
 * window, where `runServiceAction`'s Toast-based flow is proven reliable.
 *
 * No manual "Refresh" item either, for the identical reason - clicking it would close the menu and
 * kill its own `load()` call before it finished, live-tested and confirmed stuck on "Loading
 * health…" forever. Not needed anyway: per Raycast's own docs, a menu bar command "keeps the
 * command in memory while the menu is open" - simply closing and reopening the dropdown (not
 * clicking anything inside it) triggers a fresh mount and a fresh `load()` that gets to run to
 * completion while that dropdown stays open, unlike a click on an item within it.
 */
export default function MenuBar() {
  const { diskThreshold, showIcon } = getPreferenceValues<Preferences.MenuBar>();
  // A free-form textfield, not a validated number input - `Number.parseFloat(...) || 90` would
  // silently turn a deliberate `0` into `90` (falsy) and accept out-of-range garbage like `150` or
  // `80abc` (parseFloat stops at the first non-numeric character instead of rejecting it). Parse the
  // whole string and only accept a real percentage. An empty/whitespace-only value parses to `0`,
  // which is in range and would otherwise turn the icon permanently red - treat it as unset instead.
  const trimmedThreshold = diskThreshold.trim();
  const parsedThreshold = Number(trimmedThreshold);
  const threshold =
    trimmedThreshold !== "" && Number.isFinite(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 100
      ? parsedThreshold
      : 90;

  const { isLoading: instancesLoading, value: instances = [] } = useLocalStorage<Instance[]>("instances");
  const [isLoading, setIsLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, HealthState>>({});
  // A background interval tick racing a fresh mount (e.g. the icon reopened while the previous
  // load was still in flight) must not let the older call's late writes stomp the newer one's.
  const currentLoadId = useRef(0);

  // Depends only on the loaded-flag, not `instances` itself - the array's own reference changes
  // every render while it's still `undefined` (the `= []` default is a fresh literal each time),
  // which would otherwise re-trigger this effect forever. Skips fetching entirely while the icon
  // is hidden - no point spending a background SSH exec per instance on data nothing will show.
  useEffect(() => {
    if (!instancesLoading && showIcon) void load();
  }, [instancesLoading, showIcon]);

  async function load() {
    const loadId = ++currentLoadId.current;
    const isCurrent = () => loadId === currentLoadId.current;

    setIsLoading(true);
    try {
      setHealth(Object.fromEntries(instances.map((instance) => [instanceId(instance), { kind: "loading" }])));

      await mapWithConcurrency(instances, 5, async (instance) => {
        const state: HealthState = await fetchServerHealth(instance).then(
          (loadedHealth) => ({ kind: "loaded", health: loadedHealth }),
          (error: unknown) => ({ kind: "error", message: `${error}` }),
        );
        if (!isCurrent()) return;
        setHealth((current) => ({ ...current, [instanceId(instance)]: state }));
      });
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }

  // Raycast removes the menu bar item when the command returns null - the documented way to hide
  // one without disabling the command (and its background `interval` refresh) entirely.
  if (!showIcon) return null;

  const needsAttention = instances.filter((instance) => {
    const state = health[instanceId(instance)];
    return state?.kind === "error" || (state?.kind === "loaded" && diskPercent(state.health) >= threshold);
  });

  return (
    <MenuBarExtra
      icon={{ source: Icon.HardDrive, tintColor: needsAttention.length > 0 ? Color.Red : undefined }}
      isLoading={isLoading}
      tooltip="Dokploy Server Health"
    >
      {instances.length === 0 ? (
        <MenuBarExtra.Item title="No Instances Configured" />
      ) : (
        <>
          {needsAttention.length > 0 && (
            <MenuBarExtra.Section title="Needs Attention">
              {needsAttention.map((instance) => {
                const state = health[instanceId(instance)];
                const subtitle =
                  state?.kind === "loaded"
                    ? `Disk at ${diskPercent(state.health).toFixed(0)}%`
                    : state?.kind === "error"
                      ? `Could not load health: ${state.message}`
                      : undefined;
                return <MenuBarExtra.Item key={instanceId(instance)} title={instance.name} subtitle={subtitle} />;
              })}
            </MenuBarExtra.Section>
          )}
          {instances.map((instance) => {
            const state = health[instanceId(instance)];
            return (
              <MenuBarExtra.Section key={instanceId(instance)} title={instance.name}>
                {state?.kind === "loaded" ? (
                  <>
                    <MenuBarExtra.Item
                      icon={Icon.HardDrive}
                      title={`Disk: ${formatGB(state.health.diskUsedBytes)} / ${formatGB(state.health.diskTotalBytes)}`}
                    />
                    <MenuBarExtra.Item
                      icon={Icon.MemoryChip}
                      title={`Memory: ${formatGB(state.health.memUsedBytes)} / ${formatGB(state.health.memTotalBytes)}`}
                    />
                    <MenuBarExtra.Item icon={Icon.Box} title={`Containers: ${state.health.containerCount}`} />
                  </>
                ) : state?.kind === "error" ? (
                  <MenuBarExtra.Item
                    icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                    title="Could not load health"
                    subtitle={state.message}
                  />
                ) : (
                  <MenuBarExtra.Item title="Loading health…" />
                )}
              </MenuBarExtra.Section>
            );
          })}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Deployments" icon={Icon.List} onAction={() => openCommand("deployments")} />
        <MenuBarExtra.Item
          title="Open Deploy Service"
          icon={Icon.Rocket}
          onAction={() => openCommand("deploy-service")}
        />
        <MenuBarExtra.Item title="Open Instances" icon={Icon.Key} onAction={() => openCommand("instances")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

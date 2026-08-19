import { Icon, MenuBarExtra, launchCommand, LaunchType, open } from "@raycast/api";
import { fillAsset, fillLevel, stateLabel, summarise } from "./lib/runpool";
import { useStatus } from "./hooks/useStatus";

/**
 * Optional menu bar readout.
 *
 * Disabled by default in the manifest, because a menu bar is the user's own
 * space and an extension has no business claiming a slot in it uninvited.
 *
 * The icon is the mark filled to the proportion of runners that are up, so the
 * bar shows how awake the machine is at a glance rather than only that the
 * extension exists. Raycast re-renders this on every background refresh, so
 * returning a different asset each time is all the animation it needs.
 *
 * Reads with `--local`, which makes no network call. A GitHub request every
 * minute would be thousands a day and would leave the icon wrong whenever the
 * connection dropped.
 */
export default function Command() {
  const { status, isLoading, installed } = useStatus({ local: true });

  if (!installed) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} tooltip="runpool is not installed">
        <MenuBarExtra.Item
          title="Install runpool"
          subtitle="brew install aicayzer/tap/runpool"
          onAction={() => open("https://github.com/aicayzer/runpool")}
        />
      </MenuBarExtra>
    );
  }

  const runners = status?.pools.reduce((n, p) => n + p.running, 0) ?? 0;
  const capacity = status?.pools.reduce((n, p) => n + p.count, 0) ?? 0;
  const level = capacity === 0 ? 0 : runners / capacity;

  const icon = status?.paused ? "pool-off.png" : fillAsset(level);

  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} tooltip={status ? `runpool — ${summarise(status)}` : "runpool"}>
      <MenuBarExtra.Section title={status?.paused ? "Local CI is disabled" : `${runners} of ${capacity} runners up`}>
        {status?.pools.map((pool) => (
          <MenuBarExtra.Item
            key={pool.name}
            icon={{ source: fillAsset(fillLevel(pool)) }}
            title={pool.name}
            subtitle={stateLabel(pool, status.paused)}
            tooltip={pool.target}
            onAction={() => launchCommand({ name: "pools", type: LaunchType.UserInitiated })}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {/* Everything that changes state lives in the Runner Pools command,
            behind a confirmation. A menu bar item is one stray click away at
            all times, which is the wrong place for a switch that silently
            stops CI running. */}
        <MenuBarExtra.Item
          title="Show Runner Pools"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "pools", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

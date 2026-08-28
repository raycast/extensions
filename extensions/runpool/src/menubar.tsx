import { Color, Icon, MenuBarExtra, getPreferenceValues, launchCommand, LaunchType, open } from "@raycast/api";
import { errorMessage, fillAsset, fraction, isUnreachable, stateLabel } from "./lib/runpool";
import { useStatus } from "./hooks/useStatus";

/**
 * Optional menu bar readout.
 *
 * Disabled by default in the manifest, because a menu bar is the user's own
 * space and an extension has no business claiming a slot uninvited.
 *
 * Every row is `jobs/slots`, the same figure the icon fills to, so the picture
 * and the number can never disagree. There is no header count: each row already
 * carries its own, and a total on top only repeats them.
 *
 * Reads with `--local`, so no network call on a one-minute timer.
 */
export default function Command() {
  const { colourIcon } = getPreferenceValues<Preferences.Menubar>();
  const { status, isLoading, installed, error } = useStatus({ local: true });

  if (!installed) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} tooltip="runpool is not installed">
        <MenuBarExtra.Item
          title="Install RunPool"
          subtitle="brew install aicayzer/tap/runpool"
          onAction={() => open("https://github.com/aicayzer/runpool")}
        />
      </MenuBarExtra>
    );
  }

  // A failed read is not an empty pool. Falling through would draw the mark
  // empty with no rows beneath it, which says "you have no pools" when the
  // truth is "I could not ask". Retries on the next tick either way.
  if (error && !status) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} tooltip="RunPool: could not read pools">
        <MenuBarExtra.Item
          title="Could Not Read Pools"
          subtitle={errorMessage(error)}
          onAction={() => launchCommand({ name: "pools", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  const busy = status?.pools.reduce((n, p) => n + p.busy, 0) ?? 0;
  const slots = status?.pools.reduce((n, p) => n + p.count, 0) ?? 0;

  // Monochrome by default, tinted to the menu bar's own text colour so it is
  // dark on a light bar and light on a dark one, the way every native item
  // behaves. A flat single-colour mark tints cleanly.
  const source = status?.paused ? "bar-off.png" : fillAsset(busy, slots);
  const icon = colourIcon ? { source } : { source, tintColor: Color.PrimaryText };

  return (
    <MenuBarExtra
      icon={icon}
      isLoading={isLoading}
      tooltip={status?.paused ? "RunPool: runner pools paused" : `RunPool: ${busy} of ${slots} runners busy`}
    >
      <MenuBarExtra.Section title={status?.paused ? "Runner pools paused" : undefined}>
        {status?.pools.map((pool) => (
          <MenuBarExtra.Item
            key={pool.name}
            icon={
              colourIcon
                ? { source: status?.paused || pool.paused ? "bar-off.png" : fillAsset(pool.busy, pool.count) }
                : {
                    source: status?.paused || pool.paused ? "bar-off.png" : fillAsset(pool.busy, pool.count),
                    tintColor: Color.SecondaryText,
                  }
            }
            title={pool.name}
            // A fault is the one thing that earns different treatment: a
            // fraction would say "0/2" and hide that nothing can ever pick up.
            subtitle={
              status?.paused || pool.paused || isUnreachable(pool)
                ? stateLabel(pool, status?.paused ?? false)
                : fraction(pool)
            }
            tooltip={pool.target}
            onAction={() => launchCommand({ name: "pools", type: LaunchType.UserInitiated })}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {/* Nothing here changes state. A menu bar item is one stray click away
            at all times, which is the wrong home for a switch that silently
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

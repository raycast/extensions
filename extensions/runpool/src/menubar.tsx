import { Color, Icon, MenuBarExtra, getPreferenceValues, launchCommand, LaunchType, open } from "@raycast/api";
import { fillAsset, fraction, isUnreachable, stateLabel } from "./lib/runpool";
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
  const { status, isLoading, installed } = useStatus({ local: true });

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

  const busy = status?.pools.reduce((n, p) => n + p.busy, 0) ?? 0;
  const slots = status?.pools.reduce((n, p) => n + p.count, 0) ?? 0;

  // Monochrome by default, tinted to the menu bar's own text colour so it is
  // dark on a light bar and light on a dark one, the way every native item
  // behaves. A flat single-colour mark tints cleanly.
  const source = status?.paused ? "bar-off.png" : fillAsset(busy, slots, "bar");
  const icon = colourIcon ? { source } : { source, tintColor: Color.PrimaryText };

  return (
    <MenuBarExtra
      icon={icon}
      isLoading={isLoading}
      tooltip={status?.paused ? "RunPool: local CI disabled" : `RunPool: ${busy} of ${slots} runners busy`}
    >
      <MenuBarExtra.Section title={status?.paused ? "Local CI disabled" : undefined}>
        {status?.pools.map((pool) => (
          <MenuBarExtra.Item
            key={pool.name}
            icon={{ source: fillAsset(pool.busy, pool.count) }}
            title={pool.name}
            // A fault is the one thing that earns different treatment: a
            // fraction would say "0/2" and hide that nothing can ever pick up.
            subtitle={isUnreachable(pool) ? stateLabel(pool, false) : fraction(pool)}
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

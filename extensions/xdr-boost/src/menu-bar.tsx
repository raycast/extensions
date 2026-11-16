import { redactSecrets } from "@chrismessina/raycast-kit/errors";
import { showError } from "@chrismessina/raycast-kit/toast";
import { useEffect, useState } from "react";
import { Clipboard, environment, getPreferenceValues, Icon, Keyboard, LaunchType, MenuBarExtra } from "@raycast/api";
import { applyOperation, continuityMessage, getWanted, tuning } from "./lib/control";
import { allState, GAMMA_UNSUPPORTED, highestLevel, pauseLabel, shortLabel } from "./lib/displays";
import * as helper from "./lib/helper";
import { HelperDisplay, HelperStatus, isStale } from "./lib/helper";
import { dialIcon, menuBarIcon } from "./lib/icons";
import { matchesTuning, type Operation } from "./lib/intent";
import { shouldRestart } from "./lib/keepalive";
import { indexOfLevel, LEVELS, presetAt } from "./lib/levels";
import { log } from "./lib/log";

const STATUS_SUFFIX: Partial<Record<HelperDisplay["status"], string>> = {
  paused: "Paused",
  waiting: "Waiting",
  limited: "Limited",
  "edr-unavailable": "EDR Unavailable",
};

export default function Command() {
  const [status, setStatus] = useState<HelperStatus>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(true);

  async function report(err: unknown, title: string) {
    setError(redactSecrets(err instanceof Error ? err.message : String(err)));
    log(title, { error: err instanceof Error ? err.message : String(err) });
    if (environment.launchType !== LaunchType.Background) await showError(err, { title });
  }

  useEffect(() => {
    (async () => {
      const [live, saved] = await Promise.all([helper.status(), getWanted()]);
      const { restoreAfterRestart } = getPreferenceValues<Preferences>();
      const restart = shouldRestart({ restoreAfterRestart, running: live.running, wanted: saved });
      const stale = isStale(live);
      log("tick", { running: live.running, stale, saved, restart });
      const tuningChanged = live.running && !stale && !matchesTuning(live, tuning());
      let current = live;
      // Re-applying the saved intent replaces an older build's helper, restarts after a restart, and hands a
      // running helper changed preferences.
      if (stale || restart || tuningChanged) {
        const applied = await applyOperation({ kind: "restore" });
        current = applied.after;
        const lost = continuityMessage(applied);
        if (lost) setError(lost);
      }
      setStatus(current);
    })()
      .catch((err) => report(err, "Couldn't Read XDR Boost"))
      .finally(() => setBusy(false));
  }, []);

  async function choose(op: Operation) {
    setBusy(true);
    try {
      const applied = await applyOperation(op);
      setStatus(applied.after);
      setError(continuityMessage(applied));
    } catch (err) {
      await report(err, "Couldn't Change XDR Boost");
    } finally {
      setBusy(false);
    }
  }

  const displays = status?.displays ?? [];
  const highest = indexOfLevel(highestLevel(displays));
  const all = allState(displays);

  return (
    <MenuBarExtra
      icon={menuBarIcon(highest)}
      tooltip={`XDR Boost: ${shortLabel(highestLevel(displays))}`}
      isLoading={busy}
    >
      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={error} icon={Icon.ExclamationMark} />
          <MenuBarExtra.Item title="Copy Error" icon={Icon.Clipboard} onAction={() => Clipboard.copy(error)} />
        </MenuBarExtra.Section>
      )}
      {status?.gammaSupported === false && <MenuBarExtra.Item title={GAMMA_UNSUPPORTED} icon={Icon.Warning} />}
      {status && pauseLabel(status) && <MenuBarExtra.Item title={pauseLabel(status) as string} icon={Icon.Pause} />}
      {status && displays.length === 0 && <MenuBarExtra.Item title="No XDR Display Found" icon={Icon.Warning} />}
      {displays.length === 1 && (
        <MenuBarExtra.Section title={displayTitle(displays[0])}>
          {levelItems(
            displays[0].level,
            (level) => choose({ kind: "displays", levels: { [displays[0].uuid]: level } }),
            true,
          )}
        </MenuBarExtra.Section>
      )}
      {displays.length > 1 && (
        <MenuBarExtra.Section title="All Displays">
          {LEVELS.map((level, index) => (
            <MenuBarExtra.Item
              key={level.name}
              title={level.name}
              icon={dialIcon(index, all.kind === "preset" && all.index === index)}
              // ⌘0–⌘4 while the menu is open, as in Headroom's menu.
              shortcut={shortcut(index)}
              onAction={() => choose({ kind: "all", level: level.value })}
            />
          ))}
          {all.kind === "custom" && <MenuBarExtra.Item title="Custom" icon={dialIcon(all.index, true)} />}
          {all.kind === "mixed" && <MenuBarExtra.Item title="Mixed" icon={dialIcon(all.index, true)} />}
        </MenuBarExtra.Section>
      )}
      {displays.length > 1 && (
        <MenuBarExtra.Section>
          {displays.map((d) => (
            <MenuBarExtra.Submenu
              key={d.uuid}
              title={`${d.name} (${shortLabel(d.level)}${STATUS_SUFFIX[d.status] ? ` · ${STATUS_SUFFIX[d.status]}` : ""})`}
              icon={dialIcon(indexOfLevel(d.level))}
            >
              {levelItems(d.level, (level) => choose({ kind: "displays", levels: { [d.uuid]: level } }), false)}
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}

function shortcut(index: number): Keyboard.Shortcut {
  return { modifiers: ["cmd"], key: String(index) as Keyboard.KeyEquivalent };
}

/** "Built-in Retina Display", plus its status when it isn't simply on or off ("· Waiting"). */
function displayTitle(d: HelperDisplay): string {
  const suffix = STATUS_SUFFIX[d.status];
  return suffix && d.status !== "paused" ? `${d.name} · ${suffix}` : d.name;
}

/** The five levels for one display, its current preset filled, plus a Custom row for a level between presets. */
function levelItems(current: number, pick: (level: number) => void, shortcuts: boolean) {
  const preset = presetAt(current);
  return [
    ...LEVELS.map((level, index) => (
      <MenuBarExtra.Item
        key={level.name}
        title={level.name}
        icon={dialIcon(index, preset === level)}
        shortcut={shortcuts ? shortcut(index) : undefined}
        onAction={() => pick(level.value)}
      />
    )),
    ...(preset ? [] : [<MenuBarExtra.Item key="custom" title="Custom" icon={dialIcon(indexOfLevel(current), true)} />]),
  ];
}

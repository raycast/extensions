import {
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { type Display, listDisplays, setHdr } from "./hdr";
import { readRules } from "./lib/rules";

function targetDisplay(displays: Display[]): Display | undefined {
  const preferences = getPreferenceValues<Preferences.MenuBar>();
  const wanted = preferences.displayName?.trim().toLowerCase() ?? "";

  if (wanted.length > 0) {
    return displays.find((display) => display.name.trim().toLowerCase() === wanted);
  }

  return displays.find((display) => !display.builtin && display.hdrCapable);
}

/** Same-named displays get an id suffix so their menu items stay distinct. */
function itemTitle(display: Display, displays: Display[]): string {
  const wanted = display.name.trim().toLowerCase();
  const duplicates = displays.filter((candidate) => candidate.name.trim().toLowerCase() === wanted);
  return duplicates.length > 1 ? `${display.name} · id ${display.id}` : display.name;
}

function rulesLabel(ruleCount: number | undefined): string {
  if (ruleCount === undefined) return "Auto-apply: …";
  if (ruleCount === 0) return "Auto-apply: no rules";
  return `Auto-apply: ${ruleCount} ${ruleCount === 1 ? "rule" : "rules"}`;
}

export default function MenuBarCommand() {
  const { data: displays, isLoading, error, revalidate: revalidateDisplays } = useCachedPromise(listDisplays);
  const { data: rulesFile, revalidate: revalidateRules } = useCachedPromise(readRules);

  async function toggleHdr(display: Display): Promise<void> {
    try {
      await setHdr(display.id, display.hdr ? "off" : "on");
    } catch (toggleError) {
      await showFailureToast(toggleError, { title: `Couldn't turn HDR ${display.hdr ? "off" : "on"}` });
    } finally {
      void revalidateDisplays();
    }
  }

  async function openAutoApply(): Promise<void> {
    try {
      await launchCommand({ name: "hdr-on-connect", type: LaunchType.UserInitiated });
    } catch (launchError) {
      await showFailureToast(launchError, { title: "Couldn't open HDR on Connect" });
    }
  }

  function refreshAll(): void {
    void revalidateDisplays();
    void revalidateRules();
  }

  const target = displays ? targetDisplay(displays) : undefined;
  const subtitle = error
    ? "HDR state unavailable"
    : displays === undefined
      ? undefined
      : target
        ? `HDR ${target.hdr ? "on" : "off"} — ${target.name}`
        : "No HDR display connected";

  // Keep the root-search label in sync; the menu-bar command is already running.
  useEffect(() => {
    if (subtitle === undefined) return;
    void updateCommandMetadata({ subtitle }).catch(() => undefined);
  }, [subtitle]);

  const statusIcon =
    error || (displays && !target) ? Icon.ExclamationMark : target?.hdr ? Icon.CircleFilled : Icon.Circle;
  const tooltip = error
    ? "Couldn't read HDR state"
    : !displays
      ? "Reading HDR state…"
      : target
        ? `HDR ${target.hdr ? "on" : "off"} — ${target.name}`
        : "No HDR display connected";

  return (
    <MenuBarExtra icon={statusIcon} tooltip={tooltip} isLoading={isLoading}>
      {displays && displays.length > 0 ? (
        displays.map((display) => {
          const canToggle = display.hdrCapable && !display.builtin;
          return (
            <MenuBarExtra.Item
              key={display.id}
              title={itemTitle(display, displays)}
              subtitle={`HDR ${display.hdr ? "on" : "off"}`}
              icon={display.hdr ? Icon.CircleFilled : Icon.Circle}
              tooltip={canToggle ? `Click to turn HDR ${display.hdr ? "off" : "on"}` : "HDR can't be changed here"}
              onAction={canToggle ? () => void toggleHdr(display) : undefined}
            />
          );
        })
      ) : (
        <MenuBarExtra.Item
          title={error ? "Couldn't read displays" : isLoading ? "Loading displays…" : "No displays found"}
          icon={error ? Icon.ExclamationMark : Icon.Monitor}
        />
      )}

      <MenuBarExtra.Section title="Auto-apply">
        <MenuBarExtra.Item
          title={rulesLabel(rulesFile?.rules.length)}
          icon={Icon.Bolt}
          tooltip="Set rules in HDR on Connect"
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refreshAll}
        />
        <MenuBarExtra.Item title="Open HDR on Connect" icon={Icon.Gear} onAction={() => void openAutoApply()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

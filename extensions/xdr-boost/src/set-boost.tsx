import { failToast, showError } from "@chrismessina/raycast-kit/toast";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { applyOperation, continuityMessage, defaultLevel, getWanted } from "./lib/control";
import { allLabel, allState, highestLevel, hud, shortLabel } from "./lib/displays";
import { HelperDisplay, HelperStatus, isStale, status } from "./lib/helper";
import { dialIcon } from "./lib/icons";
import type { Operation } from "./lib/intent";
import { indexOfLevel, LEVELS, OFF, presetAt } from "./lib/levels";

const STATUS_TAG: Partial<Record<HelperDisplay["status"], string>> = {
  paused: "Paused",
  waiting: "Waiting for EDR",
  limited: "Limited",
  "edr-unavailable": "EDR Unavailable",
};

export default function Command() {
  const [state, setState] = useState<HelperStatus>();
  const [busy, setBusy] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  async function load() {
    try {
      const [now, saved] = await Promise.all([status(), getWanted()]);
      setState(now);
      setHasSaved(saved !== undefined);
      setLoadError(undefined);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
      await showError(error, { title: "Couldn't Read XDR Boost" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function change(op: Operation, title: string) {
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const applied = await applyOperation(op, { refreshMenuBar: true });
      setState(applied.after);
      toast.style = Toast.Style.Success;
      toast.title = hud(applied.after);
      toast.message = continuityMessage(applied);
    } catch (error) {
      failToast(toast, error, { title: "Couldn't Change XDR Boost" });
    } finally {
      setBusy(false);
    }
  }

  const displays = state?.displays ?? [];
  const all = allState(displays);

  /** ↵ toggles the row between Off and the default level; ⌘K lists the five levels, current filled. */
  function actions(target: "all" | HelperDisplay) {
    const name = target === "all" ? "All Displays" : target.name;
    const current = target === "all" ? (all.kind === "preset" ? LEVELS[all.index].value : undefined) : target.level;
    const isOn = target === "all" ? displays.some((d) => d.level > OFF) : target.level > OFF;
    const request = (level: number): Operation =>
      target === "all" ? { kind: "all", level } : { kind: "displays", levels: { [target.uuid]: level } };
    // The transaction re-reads what the displays are doing under the lock.
    const toggleTo = isOn ? OFF : defaultLevel();
    const toggle: Operation =
      target === "all"
        ? { kind: "toggle", level: defaultLevel() }
        : { kind: "toggleDisplay", uuid: target.uuid, level: defaultLevel() };
    return (
      <ActionPanel title={name}>
        <Action
          title={isOn ? "Turn Off" : `Turn On at ${shortLabel(toggleTo)}`}
          icon={dialIcon(indexOfLevel(toggleTo))}
          onAction={() => change(toggle, isOn ? `Turning Off ${name}` : `Boosting ${name}`)}
        />
        <ActionPanel.Section title="Set Level">
          {LEVELS.map((level, index) => (
            <Action
              key={level.name}
              title={level.name}
              icon={dialIcon(index, current !== undefined && presetAt(current) === level)}
              onAction={() => change(request(level.value), `Setting ${name} to ${level.name}`)}
            />
          ))}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List isLoading={busy} searchBarPlaceholder="Search displays…">
      {!state && loadError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't Read XDR Boost"
          description={loadError}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      ) : state && isStale(state) ? (
        <List.Section title="Update">
          <List.Item
            title="An Older XDR Boost Helper Is Running"
            subtitle={
              hasSaved
                ? "Its levels can't be read. Replace it to apply your saved levels."
                : "Its levels can't be read and none are saved: replacing it turns the boost off."
            }
            icon={Icon.ArrowClockwise}
            actions={
              <ActionPanel>
                <Action
                  title="Replace Helper"
                  icon={Icon.ArrowClockwise}
                  onAction={() => change({ kind: "restore" }, "Replacing the XDR Boost Helper")}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : state && displays.length === 0 ? (
        <List.EmptyView
          icon={Icon.Monitor}
          title="No XDR Display Found"
          description="Connect a MacBook Pro display or a Pro Display XDR."
        />
      ) : (
        <>
          {displays.length > 1 && (
            <List.Section title="All Displays">
              <List.Item
                title="All Displays"
                icon={dialIcon(indexOfLevel(highestLevel(displays)), true)}
                accessories={[{ text: allLabel(all) }]}
                actions={actions("all")}
              />
            </List.Section>
          )}
          <List.Section title="Connected">
            {displays.map((d) => (
              <List.Item
                key={d.uuid}
                title={d.name}
                subtitle={d.builtIn ? "Built-in" : "External"}
                icon={dialIcon(indexOfLevel(d.level), true)}
                accessories={[
                  ...(STATUS_TAG[d.status] ? [{ tag: STATUS_TAG[d.status] as string }] : []),
                  { text: shortLabel(d.level) },
                ]}
                actions={actions(d)}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

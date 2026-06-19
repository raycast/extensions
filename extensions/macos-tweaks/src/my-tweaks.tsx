import { Action, ActionPanel, Alert, Color, Icon, List, Clipboard, confirmAlert, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { ALL_TWEAKS } from "./tweaks";
import { CATEGORY_META } from "./types";
import type { TweakCategory, TweakState } from "./types";
import { getAllTweakStates, getCommandString, resetTweak } from "./utils/defaults";
import { formatValue, buildDetailMarkdown } from "./utils/format";

export default function MyTweaks() {
  const [tweakStates, setTweakStates] = useState<TweakState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTweaks = useCallback(async () => {
    setIsLoading(true);
    const states = (await getAllTweakStates(ALL_TWEAKS)).filter((t) => t.isModified);
    setTweakStates(states);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTweaks();
  }, [loadTweaks]);

  // Group by category
  const grouped = new Map<TweakCategory, TweakState[]>();
  for (const t of tweakStates) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={tweakStates.length > 0}
      searchBarPlaceholder="Search modified tweaks..."
    >
      {tweakStates.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Modified Tweaks"
          description="All settings are at their system defaults. Use Browse Tweaks to make changes."
          icon={Icon.CheckCircle}
        />
      ) : (
        Array.from(grouped.entries()).map(([category, tweaks]) => (
          <List.Section key={category} title={CATEGORY_META[category].title} subtitle={`${tweaks.length} modified`}>
            {tweaks.map((tweak) => (
              <List.Item
                key={tweak.id}
                title={tweak.title}
                icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
                accessories={[{ text: formatValue(tweak) }]}
                detail={<List.Item.Detail markdown={buildDetailMarkdown(tweak, { showCategory: true })} />}
                actions={
                  <ActionPanel>
                    <Action
                      title="Reset to Default"
                      icon={Icon.ArrowCounterClockwise}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: `Reset "${tweak.title}"?`,
                          message: `This will revert to the system default value.${tweak.requiresRestart ? ` ${tweak.requiresRestart} will be restarted.` : ""}`,
                          primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
                        });
                        if (!confirmed) return;
                        try {
                          resetTweak(tweak);
                          await showToast({ style: Toast.Style.Success, title: `${tweak.title}: Reset` });
                          await loadTweaks();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to reset",
                            message: error instanceof Error ? error.message : undefined,
                          });
                        }
                      }}
                    />
                    <Action
                      title="Copy Defaults Command"
                      icon={Icon.Clipboard}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={async () => {
                        const cmd = getCommandString(tweak, tweak.currentValue);
                        await Clipboard.copy(cmd);
                        await showToast({ title: "Copied", message: cmd });
                      }}
                    />
                    <Action
                      title="Reset All to Defaults"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: `Reset All ${tweakStates.length} Tweaks?`,
                          message:
                            "This will revert all modified settings to their system defaults. Affected processes will be restarted.",
                          primaryAction: { title: "Reset All", style: Alert.ActionStyle.Destructive },
                        });
                        if (!confirmed) return;
                        try {
                          for (const t of tweakStates) {
                            resetTweak(t);
                          }
                          await showToast({ style: Toast.Style.Success, title: "All tweaks reset to defaults" });
                          await loadTweaks();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to reset all",
                            message: error instanceof Error ? error.message : undefined,
                          });
                        }
                      }}
                    />
                    <Action
                      title="Export All as Commands"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={async () => {
                        const commands = tweakStates.map((t) => getCommandString(t, t.currentValue)).join("\n");
                        await Clipboard.copy(commands);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Exported",
                          message: `${tweakStates.length} commands copied to clipboard`,
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

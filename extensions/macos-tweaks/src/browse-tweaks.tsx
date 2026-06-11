import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, showToast, Toast, Clipboard } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { ALL_TWEAKS } from "./tweaks";
import { CATEGORY_META } from "./types";
import type { TweakCategory, TweakState } from "./types";
import { applyTweak, getAllTweakStates, getCommandString, getResetCommandString, resetTweak } from "./utils/defaults";
import { formatValue, buildDetailMarkdown } from "./utils/format";

type FilterMode = "all" | "modified" | "default";

export default function BrowseTweaks() {
  const [tweakStates, setTweakStates] = useState<TweakState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FilterMode>("all");

  const loadTweaks = useCallback(async () => {
    setIsLoading(true);
    const states = await getAllTweakStates(ALL_TWEAKS);
    setTweakStates(states);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTweaks();
  }, [loadTweaks]);

  const filtered = tweakStates.filter((t) => {
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (statusFilter === "modified" && !t.isModified) return false;
    if (statusFilter === "default" && t.isModified) return false;
    return true;
  });

  // Group by category
  const grouped = new Map<TweakCategory, TweakState[]>();
  for (const t of filtered) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  const modifiedCount = tweakStates.filter((t) => t.isModified).length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search tweaks..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue
          onChange={(val) => {
            if (val === "all" || val === "modified" || val === "default") {
              setStatusFilter(val);
              setCategoryFilter("all");
            } else {
              setCategoryFilter(val);
              setStatusFilter("all");
            }
          }}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title={`All Tweaks (${tweakStates.length})`} value="all" />
            <List.Dropdown.Item title={`Modified (${modifiedCount})`} value="modified" />
            <List.Dropdown.Item title={`Default (${tweakStates.length - modifiedCount})`} value="default" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Category">
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = tweakStates.filter((t) => t.category === key).length;
              return <List.Dropdown.Item key={key} title={`${meta.title} (${count})`} value={key} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {Array.from(grouped.entries()).map(([category, tweaks]) => (
        <List.Section key={category} title={CATEGORY_META[category].title} subtitle={`${tweaks.length} tweaks`}>
          {tweaks.map((tweak) => (
            <TweakItem key={tweak.id} tweak={tweak} onUpdate={loadTweaks} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function TweakItem({ tweak, onUpdate }: { tweak: TweakState; onUpdate: () => void }) {
  const statusIcon = tweak.isModified
    ? { source: Icon.CircleFilled, tintColor: Color.Orange }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };

  return (
    <List.Item
      title={tweak.title}
      icon={statusIcon}
      accessories={[{ text: formatValue(tweak) }]}
      detail={<List.Item.Detail markdown={buildDetailMarkdown(tweak)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {tweak.type === "boolean" ? (
              <ToggleAction tweak={tweak} onUpdate={onUpdate} />
            ) : tweak.type === "enum" && tweak.options ? (
              <EnumActions tweak={tweak} onUpdate={onUpdate} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {tweak.isModified && <ResetAction tweak={tweak} onUpdate={onUpdate} />}
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
              title="Copy Reset Command"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              onAction={async () => {
                const cmd = getResetCommandString(tweak);
                await Clipboard.copy(cmd);
                await showToast({ title: "Copied", message: cmd });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ToggleAction({ tweak, onUpdate }: { tweak: TweakState; onUpdate: () => void }) {
  const currentBool = tweak.currentValue === true;
  const newValue = !currentBool;
  const label = newValue ? "Enable" : "Disable";

  return (
    <Action
      title={`${label} ${tweak.title}`}
      icon={newValue ? Icon.CheckCircle : Icon.XMarkCircle}
      onAction={async () => {
        try {
          if (tweak.risk === "moderate") {
            const confirmed = await confirmAlert({
              title: `${label} "${tweak.title}"?`,
              message: `This setting is marked as moderate risk. ${tweak.requiresRestart ? `${tweak.requiresRestart} will be restarted.` : ""}`,
              primaryAction: { title: label, style: Alert.ActionStyle.Default },
            });
            if (!confirmed) return;
          }
          applyTweak(tweak, newValue);
          await showToast({
            style: Toast.Style.Success,
            title: `${tweak.title}: ${label}d`,
            message: tweak.requiresRestart ? `${tweak.requiresRestart} restarted` : undefined,
          });
          onUpdate();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to apply tweak",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}

function EnumActions({ tweak, onUpdate }: { tweak: TweakState; onUpdate: () => void }) {
  if (!tweak.options) return null;

  return (
    <ActionPanel.Submenu title={`Set ${tweak.title}`} icon={Icon.List}>
      {tweak.options.map((opt) => {
        const isCurrent = String(tweak.currentValue) === String(opt.value);
        return (
          <Action
            key={String(opt.value)}
            title={`${opt.title}${isCurrent ? " (current)" : ""}`}
            icon={isCurrent ? Icon.CheckCircle : Icon.Circle}
            onAction={async () => {
              try {
                if (tweak.risk === "moderate") {
                  const confirmed = await confirmAlert({
                    title: `Set "${tweak.title}"?`,
                    message: `This setting is marked as moderate risk.${tweak.requiresRestart ? ` ${tweak.requiresRestart} will be restarted.` : ""}`,
                    primaryAction: { title: "Set", style: Alert.ActionStyle.Default },
                  });
                  if (!confirmed) return;
                }
                applyTweak(tweak, opt.value);
                await showToast({
                  style: Toast.Style.Success,
                  title: `${tweak.title}: ${opt.title}`,
                  message: tweak.requiresRestart ? `${tweak.requiresRestart} restarted` : undefined,
                });
                onUpdate();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to apply tweak",
                  message: error instanceof Error ? error.message : undefined,
                });
              }
            }}
          />
        );
      })}
    </ActionPanel.Submenu>
  );
}

function ResetAction({ tweak, onUpdate }: { tweak: TweakState; onUpdate: () => void }) {
  return (
    <Action
      title="Reset to Default"
      icon={Icon.ArrowCounterClockwise}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Reset "${tweak.title}"?`,
          message: `This will revert to the system default value.${tweak.requiresRestart ? ` ${tweak.requiresRestart} will be restarted.` : ""}`,
          primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        try {
          resetTweak(tweak);
          await showToast({
            style: Toast.Style.Success,
            title: `${tweak.title}: Reset to default`,
          });
          onUpdate();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to reset tweak",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      }}
    />
  );
}

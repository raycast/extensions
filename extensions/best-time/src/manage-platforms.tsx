import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { IconColorMode, platformIcon } from "./icons";
import { platformById } from "./heatmaps";
import {
  PlatformsConfig,
  exclude,
  include,
  moveDown,
  moveUp,
  savePlatformsConfig,
} from "./storage";

/**
 * Drag-and-drop-style platforms editor, since Raycast's preferences schema
 * can't express orderable include/exclude. Two sections — Included on top
 * (in display order), Excluded below. Keyboard actions move items between
 * sections and reorder within Included.
 *
 * State lives in the parent; we receive the current config and an `onApply`
 * callback. Persistence to LocalStorage happens here so the parent's
 * lifecycle doesn't need to know about IO.
 */
export function ManagePlatforms({
  config,
  iconMode,
  onApply,
}: {
  config: PlatformsConfig;
  iconMode: IconColorMode;
  onApply: (next: PlatformsConfig) => void;
}) {
  // Local mirror so the list updates instantly; the parent's copy syncs
  // through `onApply` and is what gets written to storage.
  const [local, setLocal] = useState(config);

  // If the parent reloads config externally (rare), reflect it.
  useEffect(() => setLocal(config), [config]);

  const apply = (next: PlatformsConfig) => {
    setLocal(next);
    onApply(next);
    void savePlatformsConfig(next);
  };

  return (
    <List
      navigationTitle="Manage Platforms"
      searchBarPlaceholder="Filter platforms"
    >
      <List.Section
        title="Included"
        subtitle={`${local.included.length} · shown in this order`}
      >
        {local.included.map((id, i) => {
          const p = platformById(id);
          if (!p) return null;
          const isFirst = i === 0;
          const isLast = i === local.included.length - 1;
          return (
            <List.Item
              key={`inc-${id}`}
              icon={platformIcon(p, iconMode)}
              title={p.name}
              accessories={[{ text: `${i + 1}` }]}
              actions={
                <ActionPanel>
                  {!isFirst && (
                    <Action
                      title="Move Up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                      onAction={() => apply(moveUp(local, id))}
                    />
                  )}
                  {!isLast && (
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                      onAction={() => apply(moveDown(local, id))}
                    />
                  )}
                  <Action
                    title="Move to Excluded"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    onAction={() => apply(exclude(local, id))}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section
        title="Excluded"
        subtitle={`${local.excluded.length} · hidden`}
      >
        {local.excluded.map((id) => {
          const p = platformById(id);
          if (!p) return null;
          return (
            <List.Item
              key={`exc-${id}`}
              icon={platformIcon(p, iconMode)}
              title={p.name}
              actions={
                <ActionPanel>
                  <Action
                    title="Move to Included"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                    onAction={() => apply(include(local, id))}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Shortcuts">
        <List.Item
          icon={Icon.Info}
          title="⌘ ↑ / ⌘ ↓ reorder · ⌘ → exclude · ⌘ ← include"
        />
      </List.Section>
    </List>
  );
}

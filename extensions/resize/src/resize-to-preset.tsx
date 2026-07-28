import { Action, ActionPanel, Detail, Icon, List, Keyboard } from "@raycast/api";
import { openDeviceMode } from "./devtools";
import { loadPresets, presetDeeplink, USER_PRESET_PATH } from "./presets";
import { applyAndNotify } from "./resize";
import { Preset, PresetClass } from "./types";

const SECTIONS: { class: PresetClass; title: string }[] = [
  { class: "laptop", title: "MacBooks" },
  { class: "tablet", title: "iPads" },
  { class: "phone", title: "iPhones — DevTools territory" },
  { class: "custom", title: "Custom" },
];

export default function Command() {
  const { presets } = loadPresets();

  return (
    <List searchBarPlaceholder="Search device presets…">
      {SECTIONS.map((s) => (
        <List.Section key={s.class} title={s.title}>
          {presets
            .filter((p) => p.class === s.class)
            .map((p) => (
              <PresetItem key={p.id} preset={p} />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function PresetItem({ preset: p }: { preset: Preset }) {
  const isInfo = p.strategy === "info";
  return (
    <List.Item
      title={p.name}
      icon={isInfo ? Icon.Info : p.class === "laptop" ? Icon.Monitor : Icon.Mobile}
      accessories={[
        { text: `${p.viewport.w}×${p.viewport.h}` },
        { tag: `${p.dpr}x` },
        ...(p.warnings.length > 0 ? [{ icon: Icon.ExclamationMark }] : []),
      ]}
      actions={
        <ActionPanel>
          {isInfo ? (
            <Action.Push
              title="Show Device Info"
              icon={Icon.Info}
              target={<InfoDetail preset={p} />}
            />
          ) : (
            <Action title="Apply Preset" icon={Icon.AppWindow} onAction={() => applyAndNotify(p)} />
          )}
          {!isInfo && p.warnings.length > 0 && (
            <Action.Push
              title="Show Device Info"
              icon={Icon.Info}
              target={<InfoDetail preset={p} />}
            />
          )}
          {(isInfo || p.class === "phone") && (
            <Action
              title="Open DevTools Device Mode"
              icon={Icon.Mobile}
              onAction={() => openDeviceMode(p.name, p.viewport)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Dimensions"
            content={`${p.viewport.w}x${p.viewport.h}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CreateQuicklink
            title="Create Hotkey Quicklink"
            quicklink={{ link: presetDeeplink(p), name: `Resize: ${p.name}` }}
          />
          <Action.Open
            title="Open Custom Preset File"
            target={USER_PRESET_PATH}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}

function InfoDetail({ preset: p }: { preset: Preset }) {
  const facts = [
    `**Viewport:** ${p.viewport.w}×${p.viewport.h} CSS px`,
    `**DPR:** ${p.dpr}`,
    `**Pointer:** ${p.pointer} · **Hover:** ${p.hover ? "yes" : "no"}`,
  ].join("  \n");
  const warnings = p.warnings.map((w) => `- ${w}`).join("\n");
  const md = `# ${p.name}\n\n${facts}\n\n## Test checklist\n\n${warnings || "- none"}\n`;
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Open DevTools Device Mode"
            icon={Icon.Mobile}
            onAction={() => openDeviceMode(p.name, p.viewport)}
          />
          <Action.CopyToClipboard
            title="Copy Dimensions"
            content={`${p.viewport.w}x${p.viewport.h}`}
          />
        </ActionPanel>
      }
    />
  );
}

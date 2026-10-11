import { Action, ActionPanel, Detail, Icon, List, Keyboard, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { openDeviceMode } from "./devtools";
import { ensureUserPresetFile, loadPresets, presetDeeplink } from "./presets";
import { applyAndNotify } from "./resize";
import { Preset, PresetClass } from "./types";

const SECTIONS: { class: PresetClass; title: string }[] = [
  { class: "laptop", title: "MacBooks" },
  { class: "tablet", title: "iPads" },
  { class: "phone", title: "iPhones — DevTools territory" },
  { class: "custom", title: "Custom" },
];

export default function Command() {
  const { data, error, isLoading } = usePromise(async () => loadPresets(), []);
  const presets = data?.presets ?? [];

  return (
    <List searchBarPlaceholder="Search device presets…" isLoading={isLoading}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Couldn't load presets" description={error.message} />
      ) : !isLoading && presets.length === 0 ? (
        <List.EmptyView
          icon={Icon.AppWindow}
          title="No presets"
          description="Built-in device data is missing. Reinstall the extension or add a custom preset."
        />
      ) : (
        SECTIONS.map((s) => {
          const items = presets.filter((p) => p.class === s.class);
          if (items.length === 0) return null;
          return (
            <List.Section key={s.class} title={s.title}>
              {items.map((p) => (
                <PresetItem key={p.id} preset={p} />
              ))}
            </List.Section>
          );
        })
      )}
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
            <Action.Push title="Show Device Info" icon={Icon.Info} target={<InfoDetail preset={p} />} />
          ) : (
            <Action title="Apply Preset" icon={Icon.AppWindow} onAction={() => applyAndNotify(p)} />
          )}
          {!isInfo && p.warnings.length > 0 && (
            <Action.Push title="Show Device Info" icon={Icon.Info} target={<InfoDetail preset={p} />} />
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
            quicklink={{ link: presetDeeplink(p), name: `Chrome Viewport: ${p.name}` }}
          />
          <Action
            title="Open Custom Preset File"
            icon={Icon.Document}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(ensureUserPresetFile())}
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
          <Action.CopyToClipboard title="Copy Dimensions" content={`${p.viewport.w}x${p.viewport.h}`} />
        </ActionPanel>
      }
    />
  );
}

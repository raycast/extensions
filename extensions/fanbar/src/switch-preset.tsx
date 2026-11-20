import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showHUD, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FailureEmptyView, showFailureToast } from "./lib/components";
import { FanBarPreset, runFanBar } from "./lib/fanbar";

export default function SwitchPreset() {
  const { data, error, isLoading, revalidate } = usePromise(
    async () => (await runFanBar(["preset", "list"])).presets ?? [],
    [],
    { onError: () => undefined },
  );

  const presets = data ?? [];
  const builtIn = presets.filter((preset) => preset.builtIn);
  const custom = presets.filter((preset) => !preset.builtIn);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets">
      {error && !isLoading ? (
        <FailureEmptyView error={error} onRetry={revalidate} />
      ) : (
        <>
          <List.Section title="Built-in">
            {builtIn.map((preset) => (
              <PresetItem key={preset.id} preset={preset} onRefresh={revalidate} />
            ))}
          </List.Section>
          <List.Section title="Custom">
            {custom.map((preset) => (
              <PresetItem key={preset.id} preset={preset} onRefresh={revalidate} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function PresetItem(props: { preset: FanBarPreset; onRefresh: () => void }) {
  const { preset } = props;
  return (
    <List.Item
      icon={preset.builtIn ? Icon.Gauge : Icon.Stars}
      title={preset.name}
      subtitle={preset.builtIn && preset.key !== preset.name ? preset.key : undefined}
      keywords={[preset.key]}
      accessories={
        preset.selected ? [{ tag: { value: "Selected", color: Color.Green }, tooltip: "FanBar's selected preset" }] : []
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Run Preset" icon={Icon.Play} onAction={() => switchTo(preset, false)} />
            <Action
              title="Run Preset Until Changed"
              icon={Icon.Pin}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => switchTo(preset, true)}
            />
            <Action.CopyToClipboard
              title="Copy Preset Name"
              content={preset.key}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function switchTo(preset: FanBarPreset, hold: boolean) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Switching to ${preset.name}…` });
  try {
    // The id (`builtin:2`, `custom:<uuid>`) is unambiguous even when a custom
    // preset shares a built-in's name.
    const reply = await runFanBar(["preset", "set", preset.id], { hold });
    await toast.hide();
    await showHUD(reply.message || `Preset ${preset.name}`);
  } catch (error) {
    await toast.hide();
    await showFailureToast(error);
  }
}

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { shortcutActions, sameShortcut, validateShortcut, type ShortcutId } from "../services/shortcut-settings";
import { buildShortcut, DEFAULT_SHORTCUT_CONFIG, type ShortcutDefinition } from "./shortcuts";
import { shortcutKeys } from "./shortcut-keys";
import { shortcutSettings, useShortcutSettings, useShortcuts } from "./use-shortcuts";

const platform = process.platform === "darwin" ? "macOS" : "Windows";
const modifierLabels: Record<string, string> = {
  ctrl: platform === "macOS" ? "Command" : "Ctrl",
  alt: platform === "macOS" ? "Option" : "Alt",
  shift: "Shift",
  physical_ctrl: "Control (physical Ctrl)",
};
function label(def: ShortcutDefinition) {
  const binding = buildShortcut(def)[platform]!;
  const names: Record<string, string> = { cmd: "Cmd", ctrl: "Ctrl", opt: "Option", alt: "Alt", shift: "Shift" };
  return [
    ...binding.modifiers.map((m) => names[m] ?? m),
    shortcutKeys[binding.key as keyof typeof shortcutKeys] ?? binding.key.toUpperCase(),
  ].join(" + ");
}
async function perform(task: () => Promise<void>, title: string) {
  try {
    await task();
    await showToast({ style: Toast.Style.Success, title });
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to Save Shortcuts",
      message: error instanceof Error ? error.message : "Please try again.",
    });
    return false;
  }
}
async function resetAll() {
  if (
    await confirmAlert({
      title: "Restore All Default Shortcuts?",
      message:
        "This replaces all custom Music action shortcuts. Your connection settings and Raycast command hotkeys are unaffected.",
      primaryAction: { title: "Restore Defaults", style: Alert.ActionStyle.Destructive },
    })
  )
    await perform(() => shortcutSettings.reset(), "Default Shortcuts Restored");
}
export function KeyboardShortcutsAction() {
  const shortcuts = useShortcuts();
  return (
    <Action.Push
      title="Keyboard Shortcuts"
      icon={Icon.Keyboard}
      shortcut={shortcuts.keyboardShortcuts}
      target={<ShortcutSettingsView />}
    />
  );
}
export function ShortcutSettingsView() {
  const { config, ready, review, error } = useShortcutSettings();
  const shortcuts = useShortcuts();
  if (!ready) return <Detail isLoading markdown="Loading shortcuts…" />;
  return (
    <List navigationTitle="Music · Keyboard Shortcuts" searchBarPlaceholder="Find an action…">
      <List.EmptyView
        title="No Matching Shortcuts"
        description="Search for an action such as Play/Pause, Volume, or Queue."
        actions={
          <ActionPanel>
            <Action
              title="Extension Preferences"
              shortcut={shortcuts.preferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
      {(review || error) && (
        <List.Section title="Review Your Shortcuts">
          <List.Item
            title={error ? "Saved Shortcuts Could Not Be Loaded" : "Shortcuts Have Moved Here"}
            subtitle="Press Enter for details"
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Review Shortcut Settings"
                  target={
                    <Detail
                      markdown={
                        error
                          ? `# Saved shortcuts unavailable\n\n${error}`
                          : "# Keyboard shortcuts now live in Music\n\nAll default keybinds are unchanged. Previous custom values are imported when Raycast makes them available. Raycast may no longer expose removed preference fields, so **check your shortcuts below and reapply any missing custom bindings**.\n\nSelect an action to edit its modifiers and key. Changes take effect when saved. These shortcuts apply inside Music; global command hotkeys are still managed by Raycast.\n\nReturn with Escape to review the list, then choose Mark Shortcuts Reviewed."
                      }
                      actions={
                        <ActionPanel>
                          {!error && (
                            <Action
                              title="Mark Shortcuts Reviewed"
                              onAction={() => perform(() => shortcutSettings.acknowledge(), "Shortcuts Reviewed")}
                            />
                          )}
                          <Action title="Restore All Defaults" onAction={resetAll} />
                        </ActionPanel>
                      }
                    />
                  }
                />
                {!error && (
                  <Action
                    title="Mark Shortcuts Reviewed"
                    onAction={() => perform(() => shortcutSettings.acknowledge(), "Shortcuts Reviewed")}
                  />
                )}
                <Action title="Restore All Defaults" onAction={resetAll} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {["Playback", "Volume", "Queue", "Navigation"].map((group) => (
        <List.Section key={group} title={group}>
          {shortcutActions
            .filter((a) => a.group === group)
            .map((action) => (
              <List.Item
                key={action.id}
                title={action.title}
                keywords={[group, label(config[action.id]!)]}
                accessories={[
                  { text: label(config[action.id]!) },
                  { tag: sameShortcut(config[action.id]!, DEFAULT_SHORTCUT_CONFIG[action.id]!) ? "Default" : "Custom" },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push title="Edit Shortcut" icon={Icon.Pencil} target={<ShortcutEditor id={action.id} />} />
                    <Action
                      title="Restore Default"
                      onAction={() => perform(() => shortcutSettings.reset(action.id), "Default Shortcut Restored")}
                    />
                    <Action title="Restore All Defaults" onAction={resetAll} />
                    {review && !error && (
                      <Action
                        title="Mark Shortcuts Reviewed"
                        onAction={() => perform(() => shortcutSettings.acknowledge(), "Shortcuts Reviewed")}
                      />
                    )}
                    <Action
                      title="Extension Preferences"
                      shortcut={shortcuts.preferences}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
      <List.Section title="Fixed Shortcuts">
        <List.Item
          title="Keyboard Shortcuts"
          accessories={[{ text: platform === "macOS" ? "Cmd + Shift + ." : "Ctrl + Shift + ." }]}
        />
        <List.Item
          title="Extension Preferences"
          accessories={[{ text: platform === "macOS" ? "Cmd + ." : "Ctrl + ." }]}
          actions={
            <ActionPanel>
              <Action
                title="Extension Preferences"
                shortcut={shortcuts.preferences}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
function ShortcutEditor({ id }: { id: ShortcutId }) {
  const { config } = useShortcutSettings();
  const initial = config[id]!;
  const [mod1, setMod1] = useState(initial.mod1);
  const [mod2, setMod2] = useState(initial.key === "na" ? "none" : initial.mod2);
  const [key, setKey] = useState(initial.key === "na" ? initial.mod2 : initial.key);
  const [saving, setSaving] = useState(false);
  const { pop } = useNavigation();
  const def = { mod1, mod2: mod2 === "none" ? key : mod2, key: mod2 === "none" ? "na" : key };
  const error = validateShortcut(id, def, config);
  async function save() {
    if (saving || error) return;
    setSaving(true);
    if (await perform(() => shortcutSettings.save(id, def), "Shortcut Saved")) pop();
    setSaving(false);
  }
  return (
    <Form
      navigationTitle={`Edit ${shortcutActions.find((a) => a.id === id)!.title} Shortcut`}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Shortcut" onSubmit={save} />
          <Action title="Cancel" onAction={pop} />
          <Action
            title="Restore Default"
            onAction={() => {
              const d = DEFAULT_SHORTCUT_CONFIG[id]!;
              setMod1(d.mod1);
              setMod2(d.key === "na" ? "none" : d.mod2);
              setKey(d.key === "na" ? d.mod2 : d.key);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Shortcut" text={error ?? label(def)} />
      <Form.Description title="Default" text={label(DEFAULT_SHORTCUT_CONFIG[id]!)} />
      <Form.Dropdown id="modifier" title="Modifier" value={mod1} onChange={setMod1}>
        {Object.entries(modifierLabels).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="additionalModifier" title="Additional Modifier" value={mod2} onChange={setMod2}>
        <Form.Dropdown.Item value="none" title="None" />
        {Object.entries(modifierLabels).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="key" title="Key" value={key} onChange={setKey} error={error}>
        {Object.entries(shortcutKeys).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Save applies this shortcut throughout Music. Escape cancels. Global hotkeys for launching commands are configured in Raycast." />
    </Form>
  );
}

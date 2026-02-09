import { Action, ActionPanel, Form, Icon, List, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  ALL_KEYBINDINGS,
  formatHotkey,
  generateKeybindingsScript,
  KeybindingConfig,
  loadUserKeybindings,
  saveUserKeybindings,
  UserKeybinding,
} from "./lib/keybindings-config";
import {
  isKeybindingsRunning,
  reloadKeybindingsScript,
  writeKeybindingsScript,
  KEYBINDINGS_SCRIPT_PATH,
} from "./lib/ahk-utils";

const HOTKEY_HELP = `
AHK Hotkey Syntax:
  $ = Hook (recommended prefix)
  ^ = Ctrl
  # = Win
  ! = Alt
  + = Shift

Examples:
  $numpad1 = Numpad 1
  $^+#left = Ctrl+Shift+Win+Left
  $#!right = Win+Alt+Right
  $f1 = F1 key
`;

interface EditHotkeyProps {
  config: KeybindingConfig;
  currentHotkey: string;
  onSave: (hotkey: string) => void;
}

function EditHotkeyForm({ config, currentHotkey, onSave }: EditHotkeyProps) {
  const { pop } = useNavigation();
  const [hotkey, setHotkey] = useState(currentHotkey);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={() => {
              onSave(hotkey);
              pop();
            }}
          />
          <Action
            title="Reset to Default"
            icon={Icon.RotateAntiClockwise}
            onAction={() => setHotkey(config.defaultHotkey)}
          />
          <Action
            title="Clear Hotkey"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            onAction={() => {
              onSave("");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Action" text={config.name} />
      <Form.Description title="Description" text={config.description} />
      <Form.TextField
        id="hotkey"
        title="Hotkey"
        placeholder="e.g., $numpad1, $^#left"
        value={hotkey}
        onChange={setHotkey}
      />
      <Form.Description title="AHK Code" text={config.ahkCode} />
      <Form.Description title="Default" text={formatHotkey(config.defaultHotkey)} />
      <Form.Separator />
      <Form.Description title="Syntax Help" text={HOTKEY_HELP} />
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [userKeybindings, setUserKeybindings] = useState<UserKeybinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    async function load() {
      const kbs = await loadUserKeybindings();
      setUserKeybindings(kbs);
      const running = await isKeybindingsRunning();
      setIsRunning(running);
      setIsLoading(false);
    }
    load();
  }, []);

  const getHotkey = (id: string): string => {
    const kb = userKeybindings.find((k) => k.id === id);
    const config = ALL_KEYBINDINGS.find((c) => c.id === id);
    return kb?.hotkey ?? config?.defaultHotkey ?? "";
  };

  const updateHotkey = (id: string, hotkey: string) => {
    setUserKeybindings((prev) => {
      const existing = prev.find((k) => k.id === id);
      if (existing) {
        return prev.map((k) => (k.id === id ? { ...k, hotkey } : k));
      }
      return [...prev, { id, hotkey }];
    });
  };

  const saveAndReload = async () => {
    try {
      await saveUserKeybindings(userKeybindings);

      const scriptContent = generateKeybindingsScript(userKeybindings);
      writeKeybindingsScript(scriptContent);

      if (isRunning) {
        await reloadKeybindingsScript();
        await showHUD("Keybindings saved and daemon reloaded");
      } else {
        await showHUD("Keybindings saved");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(error),
      });
    }
  };

  const resetToDefaults = async () => {
    const defaults = ALL_KEYBINDINGS.map((kb) => ({
      id: kb.id,
      hotkey: kb.defaultHotkey,
    }));
    setUserKeybindings(defaults);
    await showToast({
      style: Toast.Style.Success,
      title: "Reset to defaults",
      message: "Press Cmd+S to save",
    });
  };

  // Group by category
  const categories = [...new Set(ALL_KEYBINDINGS.map((kb) => kb.category))];

  return (
    <List isLoading={isLoading} navigationTitle="Edit Keybindings" searchBarPlaceholder="Search commands...">
      <List.Section title={isRunning ? "✅ Daemon Running" : "⚪ Daemon Stopped"}>
        <List.Item
          icon={Icon.Keyboard}
          title="Save & Reload"
          subtitle="Save keybindings and reload daemon"
          accessories={[{ text: "⌘S" }]}
          actions={
            <ActionPanel>
              <Action
                title="Save & Reload"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={saveAndReload}
              />
              <Action title="Reset to Defaults" icon={Icon.RotateAntiClockwise} onAction={resetToDefaults} />
              <Action.OpenWith path={KEYBINDINGS_SCRIPT_PATH} title="Open Script File" />
            </ActionPanel>
          }
        />
      </List.Section>

      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {ALL_KEYBINDINGS.filter((kb) => kb.category === category).map((config) => {
            const hotkey = getHotkey(config.id);
            return (
              <List.Item
                key={config.id}
                icon={hotkey ? Icon.Key : Icon.Circle}
                title={config.name}
                subtitle={config.description}
                accessories={[{ text: formatHotkey(hotkey) }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Edit Hotkey"
                      icon={Icon.Pencil}
                      onAction={() =>
                        push(
                          <EditHotkeyForm
                            config={config}
                            currentHotkey={hotkey}
                            onSave={(newHotkey) => updateHotkey(config.id, newHotkey)}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Clear Hotkey"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={() => updateHotkey(config.id, "")}
                    />
                    <Action
                      title="Save & Reload"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={saveAndReload}
                    />
                    <Action title="Reset to Defaults" icon={Icon.RotateAntiClockwise} onAction={resetToDefaults} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

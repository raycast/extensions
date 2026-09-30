import {
  Action,
  ActionPanel,
  useNavigation,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  LocalStorage,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { HotKey } from "../types";
import { ICONS } from "../constants";
import { DEFAULT_HOTKEYS } from "../hotkeys";
import { showFailureToast } from "@raycast/utils";

// Function to save preferences
async function savePreferences(hotkeys: HotKey[]) {
  try {
    // Convert hotkeys to string
    const hotkeyString = JSON.stringify(hotkeys);

    // Save to LocalStorage
    await LocalStorage.setItem("clipyai_hotkeys", hotkeyString);

    return true;
  } catch (error) {
    console.error("Error saving preferences:", error);
    return false;
  }
}

// Function to load preferences
async function loadSavedHotkeys(): Promise<HotKey[]> {
  try {
    // Try loading from LocalStorage
    const savedHotkeys = await LocalStorage.getItem("clipyai_hotkeys");
    if (savedHotkeys && typeof savedHotkeys === "string") {
      return JSON.parse(savedHotkeys);
    }

    return DEFAULT_HOTKEYS;
  } catch (error) {
    console.error("Error loading hotkeys:", error);
    return DEFAULT_HOTKEYS;
  }
}

function HotkeyForm({ hotkey, onSave }: { hotkey?: HotKey; onSave: (hotkey: HotKey) => void }) {
  const [title, setTitle] = useState(hotkey?.title || "");
  const [subtitle, setSubtitle] = useState(hotkey?.subtitle || "");
  const [prompt, setPrompt] = useState(hotkey?.prompt || "");
  const [selectedIcon, setSelectedIcon] = useState(hotkey?.icon || Icon.Dot);
  const { pop } = useNavigation();

  const iconOptions = ICONS;

  const handleSubmit = (values: { title: string; subtitle: string; prompt: string; icon: Icon }) => {
    if (!values.title.trim() || !values.subtitle.trim() || !values.prompt.trim()) {
      showFailureToast({
        title: "Missing Fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    const newHotkey: HotKey = {
      id: hotkey?.id || `hotkey-${Date.now()}`,
      title: values.title,
      subtitle: values.subtitle,
      prompt: values.prompt,
      icon: values.icon,
    };

    onSave(newHotkey);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={hotkey ? "Update Hotkey" : "Add Hotkey"}
            icon={Icon.SaveDocument}
            onSubmit={handleSubmit}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter hotkey title" value={title} onChange={setTitle} />
      <Form.TextField
        id="subtitle"
        title="Subtitle"
        placeholder="Enter hotkey subtitle"
        value={subtitle}
        onChange={setSubtitle}
      />
      <Form.TextArea id="prompt" title="Prompt" placeholder="Enter the AI prompt" value={prompt} onChange={setPrompt} />
      <Form.Dropdown id="icon" title="Icon" value={selectedIcon} onChange={(value) => setSelectedIcon(value as Icon)}>
        {iconOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function HotkeysSettingsView({
  onSettingsChange,
  onClose,
}: {
  onSettingsChange?: () => void;
  onClose?: () => void;
}) {
  const [hotkeys, setHotkeys] = useState<HotKey[]>([]);
  const { push } = useNavigation();

  const loadHotkeys = useCallback(async () => {
    const savedHotkeys = await loadSavedHotkeys();
    setHotkeys(savedHotkeys);
  }, []);

  useEffect(() => {
    loadHotkeys();
  }, [loadHotkeys]);

  const saveHotkeys = useCallback(
    async (newHotkeys: HotKey[]) => {
      try {
        // Save to state
        setHotkeys(newHotkeys);

        // Save to preferences
        const success = await savePreferences(newHotkeys);

        if (success) {
          // Notify parent of changes
          onSettingsChange?.();

          showToast({
            style: Toast.Style.Success,
            title: "Hotkeys Updated",
            message: "Your hotkeys have been saved",
          });
        } else {
          throw new Error("Failed to save preferences");
        }
      } catch (error) {
        console.error("Failed to save hotkeys:", error);
        showFailureToast({
          title: "Error",
          message: "Failed to save hotkeys",
        });
      }
    },
    [onSettingsChange],
  );

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const addHotkey = useCallback(() => {
    const handleSave = (newHotkey: HotKey) => {
      const updatedHotkeys = [...hotkeys, newHotkey];
      saveHotkeys(updatedHotkeys);
    };

    push(<HotkeyForm onSave={handleSave} />);
  }, [hotkeys, push, saveHotkeys]);

  const editHotkey = useCallback(
    (hotkey: HotKey) => {
      const handleSave = (updatedHotkey: HotKey) => {
        const updatedHotkeys = hotkeys.map((h) => (h.id === hotkey.id ? updatedHotkey : h));
        saveHotkeys(updatedHotkeys);
      };

      push(<HotkeyForm hotkey={hotkey} onSave={handleSave} />);
    },
    [hotkeys, push, saveHotkeys],
  );

  const deleteHotkey = useCallback(
    async (hotkey: HotKey) => {
      const confirmed = await confirmAlert({
        title: "Delete Hotkey",
        message: `Are you sure you want to delete "${hotkey.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        const updatedHotkeys = hotkeys.filter((h) => h.id !== hotkey.id);
        await saveHotkeys(updatedHotkeys);
      }
    },
    [hotkeys, saveHotkeys],
  );

  const resetToDefaults = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Reset to Defaults",
      message: "This will reset all hotkeys to defaults. Are you sure?",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await saveHotkeys(DEFAULT_HOTKEYS);
    }
  }, [saveHotkeys]);

  return (
    <List
      navigationTitle="Manage Hotkeys"
      actions={
        <ActionPanel>
          <Action title="Add New Hotkey" icon={Icon.Plus} onAction={addHotkey} />
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowClockwise}
            onAction={resetToDefaults}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action title="Back to Menu" icon={Icon.ArrowLeft} onAction={handleClose} />
        </ActionPanel>
      }
    >
      <List.Section title="Hotkeys">
        {hotkeys.map((hotkey) => (
          <List.Item
            key={hotkey.id}
            title={hotkey.title}
            subtitle={hotkey.subtitle}
            icon={hotkey.icon}
            actions={
              <ActionPanel>
                <Action title="Edit Hotkey" icon={Icon.Pencil} onAction={() => editHotkey(hotkey)} />
                <Action
                  title="Delete Hotkey"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteHotkey(hotkey)}
                />
                <Action title="Add New Hotkey" icon={Icon.Plus} onAction={addHotkey} />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowClockwise}
                  onAction={resetToDefaults}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

const CUSTOM_ACTIONS_KEY = "custom-actions-v1";

export interface CustomAction {
  id: string;
  title: string;
  prompt: string;
  icon: string;
  defaultMode?: "replace" | "show";
}

export async function loadCustomActions(): Promise<CustomAction[]> {
  try {
    const saved = await LocalStorage.getItem<string>(CUSTOM_ACTIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load custom actions", e);
  }
  return [];
}

export async function saveCustomActions(
  actions: CustomAction[],
): Promise<void> {
  await LocalStorage.setItem(CUSTOM_ACTIONS_KEY, JSON.stringify(actions));
}

export default function AddCustomActionCommand() {
  return <CustomActionForm />;
}

export function CustomActionForm({
  existing,
  onSave,
}: {
  existing?: CustomAction;
  onSave?: () => void;
}) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(existing?.title || "");
  const [prompt, setPrompt] = useState(existing?.prompt || "");
  const [icon, setIcon] = useState(existing?.icon || Icon.Bolt);
  const [defaultMode, setDefaultMode] = useState<"replace" | "show">(
    existing?.defaultMode || "replace",
  );

  async function handleSubmit() {
    if (!title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }
    if (!prompt.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Prompt is required",
      });
      return;
    }

    const actions = await loadCustomActions();

    if (existing) {
      const idx = actions.findIndex((a) => a.id === existing.id);
      if (idx !== -1) {
        actions[idx] = {
          id: existing.id,
          title: title.trim(),
          prompt: prompt.trim(),
          icon: icon,
          defaultMode,
        };
      }
    } else {
      const newAction: CustomAction = {
        id: `custom-${Date.now()}`,
        title: title.trim(),
        prompt: prompt.trim(),
        icon: icon,
        defaultMode,
      };
      actions.push(newAction);
    }

    await saveCustomActions(actions);
    await showToast({
      style: Toast.Style.Success,
      title: existing ? "Action Updated" : "Action Saved",
    });
    if (onSave) onSave();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existing ? "Update Action" : "Save Action"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {Object.entries(Icon).map(([name, value]) => (
          <Form.Dropdown.Item
            key={name}
            value={value}
            title={name}
            icon={value}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="defaultMode"
        title="Enter key behavior"
        value={defaultMode}
        onChange={setDefaultMode as (v: string) => void}
      >
        <Form.Dropdown.Item
          value="replace"
          title="Replace selected text"
          icon={Icon.Pencil}
        />
        <Form.Dropdown.Item
          value="show"
          title="Show result in Raycast view"
          icon={Icon.Eye}
        />
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Command name"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Translate {selection} to french"
        value={prompt}
        onChange={setPrompt}
      />
      <Form.Description text="Selected text will automatically be appended to your prompt." />
    </Form>
  );
}

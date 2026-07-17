import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { $environments, createEnvironment, updateEnvironment } from "../store/environments";
import { useAtom } from "zod-persist/react";

interface EnvironmentFormProps {
  environmentId?: string;
}

export function EnvironmentForm({ environmentId }: EnvironmentFormProps) {
  const { pop } = useNavigation();
  const { value: environments } = useAtom($environments);
  const environmentToEdit = environments.find((e) => e.id === environmentId);

  const [name, setName] = useState(environmentToEdit?.name || "");

  const insertEmoji = (emoji: string) => {
    // If name is empty, just add emoji + space
    if (!name) {
      setName(emoji + " ");
    }
    // If name already starts with an emoji, replace it
    else if (/^[\p{Emoji}]/u.test(name)) {
      setName(emoji + " " + name.replace(/^[\p{Emoji}\s]+/u, ""));
    }
    // Otherwise prepend
    else {
      setName(emoji + " " + name);
    }
  };

  async function handleSubmit(values: { name: string }) {
    const newName = values.name.trim();

    // Check if another environment (with a different ID) already has this name.
    const isNameTaken = environments.some(
      (env) => env.name.toLowerCase() === newName.toLowerCase() && env.id !== environmentId,
    );

    if (isNameTaken) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Name Already Taken",
        message: `An environment named "${newName}" already exists.`,
      });
      return;
    }

    try {
      if (environmentId) {
        await updateEnvironment(environmentId, { name: newName });
        void showToast({ title: "Environment Updated" });
      } else {
        await createEnvironment(newName);
        void showToast({ title: "Environment Created" });
      }
      pop();
    } catch (error) {
      void showToast({ style: Toast.Style.Failure, title: "Failed to save environment", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle={environmentId ? "Edit Environment" : "Create Environment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.HardDrive} title="Save Environment" onSubmit={handleSubmit} />

          <ActionPanel.Submenu
            title="Add Environment Emoji"
            icon={Icon.Emoji}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "e" },
              windows: { modifiers: ["ctrl"], key: "e" },
            }}
          >
            <Action title="🔧 Development" onAction={() => insertEmoji("🔧")} />
            <Action title="🚧 Staging" onAction={() => insertEmoji("🚧")} />
            <Action title="🚀 Production" onAction={() => insertEmoji("🚀")} />
            <Action title="🧪 Testing" onAction={() => insertEmoji("🧪")} />
            <Action title="🌍 Global" onAction={() => insertEmoji("🌍")} />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Environment Name" placeholder="e.g., Staging" value={name} onChange={setName} />
    </Form>
  );
}

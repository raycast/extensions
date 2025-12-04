import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  List,
  useNavigation,
  Detail,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { runAppleScript, useForm } from "@raycast/utils";
import { parse as parseYAML } from "yaml";

import { openGhosttyWindow } from "./utils/scripts";
import { LaunchConfig } from "./utils/types";
import { generateWindowScript } from "./utils/helpers";

export default function Command() {
  const [items, setItems] = useState<Record<string, string>>({});

  const fetchItems = async () => {
    const items = await LocalStorage.allItems();
    setItems(items);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  if (Object.keys(items).length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Launch Configurations"
          description="Create a new launch configuration to get started."
          actions={
            <ActionPanel>
              <Action.Push title="Create Launch Configuration" target={<CreateItem onCreateSuccess={fetchItems} />} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List>
      {Object.entries(items)
        .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
        .map(([name, yaml]) => (
          <List.Item
            key={name}
            title={
              yaml
                .split("\n")
                .find((line) => line.startsWith("name:"))
                ?.replace("name:", "")
                .trim() || name
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Launch Configuration">
                  <Action title="Run Launch Configuration" onAction={() => RunLaunchConfiguration({ name })} />
                  <Action.Push title="View Launch Configuration" target={<ViewLaunchConfiguration name={name} />} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage Launch Configuration">
                  <Action.Push
                    title="Create Launch Configuration"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<CreateItem onCreateSuccess={fetchItems} />}
                  />
                  <Action.Push
                    title="Edit Launch Configuration"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditItem name={name} yaml={yaml} onEditSuccess={fetchItems} />}
                  />
                  <Action
                    title="Remove Launch Configuration"
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await removeItem(name);
                      await fetchItems();
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

async function RunLaunchConfiguration({ name }: { name: string }) {
  const yamlContent = await LocalStorage.getItem<string>(name);
  if (!yamlContent) {
    return;
  }

  try {
    const config = parseYAML(yamlContent) as LaunchConfig;
    let fullScript = "";

    for (const [windowIndex, window] of config.windows.entries()) {
      if (windowIndex === 0) {
        // First window uses the initial window
        fullScript += await runAppleScript(openGhosttyWindow);
      } else {
        // Create new window for subsequent configurations
        fullScript += `
        tell application "System Events"
          tell process "Ghostty"
            keystroke "n" using {command down}
          end tell
        end tell
        `;
      }

      fullScript += generateWindowScript(window);
    }

    await runAppleScript(fullScript);
  } catch (error) {
    console.error("Failed to parse or execute launch configuration:", error);
  }
}

function ViewLaunchConfiguration({ name }: { name: string }) {
  const [yaml, setYaml] = useState<string>("");

  useEffect(() => {
    async function loadYaml() {
      const value = await LocalStorage.getItem<string>(name);
      setYaml(value ?? "");
    }
    loadYaml();
  }, [name]);

  return (
    <Detail
      navigationTitle="Launch Configuration Preview"
      markdown={`\`\`\`yaml\n${yaml}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Launch Configuration"
            target={<EditItem name={name} yaml={yaml} onEditSuccess={async () => {}} />}
          />
          <Action.CopyToClipboard title="Copy Yaml" content={yaml} />
        </ActionPanel>
      }
    />
  );
}

function CreateItem({ onCreateSuccess }: { onCreateSuccess: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm({
    validation: {
      yaml: (value) => {
        if (!value || value.length === 0) {
          return "YAML is required";
        }
        try {
          const config = parseYAML(value) as LaunchConfig;
          if (!config.name) {
            return "YAML must include a 'name' field";
          }
        } catch (error) {
          return "Invalid YAML format";
        }
      },
    },
    onSubmit: async (values) => {
      const config = parseYAML(values.yaml) as LaunchConfig;
      const name = config.name.toLowerCase().replace(/\s+/g, "-");
      await LocalStorage.setItem(name, values.yaml);
      await onCreateSuccess();
      pop();
    },
  });

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          text="Guide"
          target="https://github.com/raycast/extensions/blob/main/extensions/ghostty/README.md"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <LaunchConfigDescription />
      <Form.TextArea title="YAML" {...itemProps.yaml} />
    </Form>
  );
}

function EditItem({ name, yaml, onEditSuccess }: { name: string; yaml: string; onEditSuccess: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm({
    initialValues: { yaml },
    validation: {
      yaml: (value) => {
        if (!value || value.length === 0) {
          return "YAML is required";
        }
        try {
          const config = parseYAML(value) as LaunchConfig;
          if (!config.name) {
            return "YAML must include a 'name' field";
          }
        } catch (error) {
          return "Invalid YAML format";
        }
      },
    },
    onSubmit: async (values) => {
      const config = parseYAML(values.yaml) as LaunchConfig;
      const newName = config.name.toLowerCase().replace(/\s+/g, "-");

      if (newName !== name) {
        // If name changed, remove old entry and create new one
        await LocalStorage.removeItem(name);
      }

      await LocalStorage.setItem(newName, values.yaml);
      await onEditSuccess();
      pop();
    },
  });

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          text="Guide"
          target="https://github.com/raycast/extensions/blob/main/extensions/ghostty/README.md"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Item" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <LaunchConfigDescription />
      <Form.TextArea title="YAML" {...itemProps.yaml} />
    </Form>
  );
}

async function removeItem(name: string) {
  await confirmAlert({
    title: "Remove Launch Configuration",
    message: "Are you sure you want to remove this launch configuration?",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        await LocalStorage.removeItem(name);
      },
    },
  });
}

function LaunchConfigDescription() {
  return <Form.Description title="💡" text={`The YAML configuration must start with a 'name' field.`} />;
}

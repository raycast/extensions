import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, List, useNavigation, Detail, confirmAlert, Alert } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { openWorkspace } from "./utils/ghostty-api";
import {
  loadStoredLaunchConfigs,
  removeLaunchConfig,
  saveLaunchConfig,
  type StoredLaunchConfig,
  validateLaunchConfigYaml,
} from "./utils/launch-configs";
import { launchConfigToWorkspaceLayouts } from "./utils/launch-config-converter";

export default function Command() {
  const [items, setItems] = useState<StoredLaunchConfig[]>([]);

  const fetchItems = async () => {
    setItems(await loadStoredLaunchConfigs());
  };

  useEffect(() => {
    fetchItems();
  }, []);

  if (items.length === 0) {
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
      {items.map((item) => (
        <List.Item
          key={item.key}
          title={item.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Launch Configuration">
                <Action title="Run Launch Configuration" onAction={() => runLaunchConfiguration(item)} />
                <Action.Push title="View Launch Configuration" target={<ViewLaunchConfiguration item={item} />} />
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
                  target={<EditItem item={item} onEditSuccess={fetchItems} />}
                />
                <Action
                  title="Remove Launch Configuration"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    await removeItem(item.key);
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

async function runLaunchConfiguration(item: StoredLaunchConfig) {
  try {
    const targets = launchConfigToWorkspaceLayouts(item.config);

    for (const { directory, layout } of targets) {
      await openWorkspace({
        title: item.name,
        directory,
        layout,
      });
    }
  } catch (error) {
    console.error("Failed to parse or execute launch configuration:", error);
  }
}

function ViewLaunchConfiguration({ item }: { item: StoredLaunchConfig }) {
  return (
    <Detail
      navigationTitle="Launch Configuration Preview"
      markdown={`\`\`\`yaml\n${item.yaml}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Launch Configuration"
            target={<EditItem item={item} onEditSuccess={async () => {}} />}
          />
          <Action.CopyToClipboard title="Copy Yaml" content={item.yaml} />
        </ActionPanel>
      }
    />
  );
}

function CreateItem({ onCreateSuccess }: { onCreateSuccess: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm({
    validation: {
      yaml: validateLaunchConfigYaml,
    },
    onSubmit: async (values) => {
      await saveLaunchConfig(undefined, values.yaml);
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

function EditItem({ item, onEditSuccess }: { item: StoredLaunchConfig; onEditSuccess: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm({
    initialValues: { yaml: item.yaml },
    validation: {
      yaml: validateLaunchConfigYaml,
    },
    onSubmit: async (values) => {
      await saveLaunchConfig(item.key, values.yaml);
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

async function removeItem(key: string) {
  await confirmAlert({
    title: "Remove Launch Configuration",
    message: "Are you sure you want to remove this launch configuration?",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        await removeLaunchConfig(key);
      },
    },
  });
}

function LaunchConfigDescription() {
  return <Form.Description title="Tip" text="The YAML configuration must start with a 'name' field." />;
}

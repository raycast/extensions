import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import YAML from "yaml";
import { executeLaunchConfig } from "./utils/launch-helpers";
import type { LaunchConfig } from "./utils/types";

const STORAGE_KEY = "kitty-launch-configs";

async function loadConfigs(): Promise<LaunchConfig[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LaunchConfig[];
  } catch {
    return [];
  }
}

async function saveConfigs(configs: LaunchConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

const EXAMPLE_YAML = `name: My Project
windows:
  - tabs:
      - title: Editor
        layout:
          cwd: ~/projects/myapp
          commands:
            - exec: nvim .
      - title: Dev Server
        layout:
          cwd: ~/projects/myapp
          commands:
            - exec: npm run dev
      - title: Logs
        layout:
          cwd: ~/projects/myapp
          split_direction: vertical
          panes:
            - cwd: ~/projects/myapp
              commands:
                - exec: tail -f logs/app.log
            - cwd: ~/projects/myapp
              commands:
                - exec: tail -f logs/error.log
`;

function ConfigForm({ initialYaml, onSave }: { initialYaml?: string; onSave: (config: LaunchConfig) => void }) {
  const { pop } = useNavigation();
  const [yamlContent, setYamlContent] = useState(initialYaml || EXAMPLE_YAML);
  const [error, setError] = useState<string>();

  function validate(value: string): boolean {
    try {
      const parsed = YAML.parse(value);
      if (!parsed?.name || !parsed?.windows) {
        setError("YAML must contain 'name' and 'windows' fields");
        return false;
      }
      setError(undefined);
      return true;
    } catch (e) {
      setError(`Invalid YAML: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Configuration"
            onSubmit={(values: { yaml: string }) => {
              if (validate(values.yaml)) {
                const parsed = YAML.parse(values.yaml) as LaunchConfig;
                onSave(parsed);
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="yaml"
        title="Configuration (YAML)"
        placeholder="Enter your launch configuration..."
        value={yamlContent}
        onChange={(val) => {
          setYamlContent(val);
          setError(undefined);
        }}
        error={error}
      />
      <Form.Description
        title="Format"
        text="Define windows with tabs, each tab can have a cwd, commands, and optional splits."
      />
    </Form>
  );
}

export default function Command() {
  const [configs, setConfigs] = useState<LaunchConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = async () => {
    setIsLoading(true);
    const loaded = await loadConfigs();
    setConfigs(loaded);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async (config: LaunchConfig, editIndex?: number) => {
    const updated = [...configs];
    if (editIndex !== undefined) {
      updated[editIndex] = config;
    } else {
      updated.push(config);
    }
    await saveConfigs(updated);
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Configuration saved" });
  };

  const handleDelete = async (index: number) => {
    const confirmed = await confirmAlert({
      title: "Delete Configuration",
      message: `Are you sure you want to delete "${configs[index].name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      const updated = configs.filter((_, i) => i !== index);
      await saveConfigs(updated);
      await refresh();
    }
  };

  const handleLaunch = async (config: LaunchConfig) => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Launching...", message: config.name });
      await executeLaunchConfig(config);
      await showToast({ style: Toast.Style.Success, title: "Launched", message: config.name });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Launch failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search launch configurations...">
      <List.Item
        title="New Configuration"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action
              title="Create Configuration"
              icon={Icon.Plus}
              onAction={() => push(<ConfigForm onSave={(c) => handleSave(c)} />)}
            />
          </ActionPanel>
        }
      />
      {configs.map((config, index) => {
        const tabCount = config.windows.reduce((sum, w) => sum + w.tabs.length, 0);
        return (
          <List.Item
            key={`${config.name}-${index}`}
            title={config.name}
            subtitle={`${config.windows.length} window(s), ${tabCount} tab(s)`}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action title="Launch" icon={Icon.Play} onAction={() => handleLaunch(config)} />
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() =>
                    push(<ConfigForm initialYaml={YAML.stringify(config)} onSave={(c) => handleSave(c, index)} />)
                  }
                />
                <Action
                  title="Duplicate"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={async () => {
                    const dup = { ...config, name: `${config.name} (copy)` };
                    await handleSave(dup);
                  }}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => handleDelete(index)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

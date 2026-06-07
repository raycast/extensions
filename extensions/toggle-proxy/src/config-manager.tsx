import {
  ActionPanel,
  Action,
  List,
  Detail,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import * as fs from "fs";
import * as path from "path";
import { getXrayPath } from "./utils/xray-config";

interface ConfigItem {
  name: string;
  path: string;
  isDefault: boolean;
  exists: boolean;
  size?: number;
  modified?: Date;
}

export default function ConfigManager() {
  const prefs = getPreferenceValues<Preferences>();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function getXrayPathLocal(): string {
    return getXrayPath(prefs.xrayPath);
  }

  function getSavedConfigNames(): string[] {
    const configs = [];

    if (prefs.defaultConfig) {
      configs.push(prefs.defaultConfig);
    }

    return configs.length > 0 ? configs : ["config.json"];
  }

  function loadConfigs() {
    setIsLoading(true);
    const xrayPathValue = getXrayPathLocal();
    const savedConfigNames = getSavedConfigNames();
    const configItems: ConfigItem[] = [];

    for (const configName of savedConfigNames) {
      const configPath = path.join(xrayPathValue, configName);
      let exists = false;
      let size: number | undefined;
      let modified: Date | undefined;

      try {
        const stats = fs.statSync(configPath);
        exists = true;
        size = stats.size;
        modified = stats.mtime;
      } catch {
        exists = false;
      }

      configItems.push({
        name: configName,
        path: configPath,
        isDefault: configName === prefs.defaultConfig,
        exists,
        size,
        modified,
      });
    }

    try {
      if (fs.existsSync(xrayPathValue)) {
        const files = fs
          .readdirSync(xrayPathValue)
          .filter((file) => file.endsWith(".json"))
          .filter((file) => !savedConfigNames.includes(file));

        for (const file of files) {
          const configPath = path.join(xrayPathValue, file);
          try {
            const stats = fs.statSync(configPath);
            configItems.push({
              name: file,
              path: configPath,
              isDefault: false,
              exists: true,
              size: stats.size,
              modified: stats.mtime,
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      console.log("Error reading directory:", error);
    }

    setConfigs(configItems);
    setIsLoading(false);
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleQuickDelete = async (config: ConfigItem) => {
    if (!config.exists) {
      showToast(Toast.Style.Failure, "File does not exist");
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete Config?",
      message: `Are you sure you want to delete ${config.name}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        fs.unlinkSync(config.path);
        showToast(Toast.Style.Success, `Config ${config.name} deleted`);
        loadConfigs();
      } catch (error) {
        showToast(Toast.Style.Failure, `Delete error: ${(error as Error).message}`);
      }
    }
  };

  function ConfigDetailView({ config }: { config: ConfigItem }) {
    const [content, setContent] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState<string>("");

    useEffect(() => {
      if (config.exists) {
        try {
          const fileContent = fs.readFileSync(config.path, "utf8");
          setContent(fileContent);
          setEditedContent(fileContent);
        } catch (error) {
          setContent(`Error reading file: ${(error as Error).message}`);
        }
      }
    }, [config]);

    const handleSave = () => {
      try {
        fs.writeFileSync(config.path, editedContent, "utf8");
        setContent(editedContent);
        setIsEditing(false);
        showToast(Toast.Style.Success, "Config saved");
        loadConfigs();
      } catch (error) {
        showToast(Toast.Style.Failure, `Save error: ${(error as Error).message}`);
      }
    };

    const handleDelete = async () => {
      const confirmed = await confirmAlert({
        title: "Delete Config?",
        message: `Are you sure you want to delete ${config.name}?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        try {
          fs.unlinkSync(config.path);
          showToast(Toast.Style.Success, "Config deleted");
          loadConfigs();
        } catch (error) {
          showToast(Toast.Style.Failure, `Delete error: ${(error as Error).message}`);
        }
      }
    };

    if (isEditing) {
      return (
        <Form
          actions={
            <ActionPanel>
              <Action title="Save" onAction={handleSave} />
              <Action title="Cancel" onAction={() => setIsEditing(false)} />
            </ActionPanel>
          }
        >
          <Form.TextArea id="content" title="Config Contents" value={editedContent} onChange={setEditedContent} />
        </Form>
      );
    }

    const markdown = config.exists
      ? `# ${config.name}\n\n**Path:** \`${config.path}\`\n**Size:** ${config.size} bytes\n**Modified:** ${config.modified?.toLocaleString()}\n\n\`\`\`json\n${content}\n\`\`\``
      : `# ${config.name}\n\n**File not found:** \`${config.path}\``;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            {config.exists && (
              <>
                <Action title="Edit" onAction={() => setIsEditing(true)} icon={Icon.Pencil} />
                <Action.CopyToClipboard title="Copy Contents" content={content} />
                <Action.OpenWith title="Open in Editor" path={config.path} />
                <Action title="Delete" onAction={handleDelete} icon={Icon.Trash} style={Action.Style.Destructive} />
              </>
            )}
            <Action.OpenWith title="Open Folder" path={path.dirname(config.path)} />
            <Action title="Refresh" onAction={loadConfigs} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search configs...">
      {configs.map((config) => (
        <List.Item
          key={config.name}
          title={config.name}
          subtitle={config.exists ? `${config.size} bytes` : "File not found"}
          accessories={[
            ...(config.isDefault ? [{ text: "Default", icon: Icon.Star }] : []),
            ...(config.modified ? [{ date: config.modified }] : []),
            { icon: config.exists ? Icon.CheckCircle : Icon.XMarkCircle },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<ConfigDetailView config={config} />} icon={Icon.Eye} />
              {config.exists && (
                <>
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={config.path}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenWith
                    title="Open in Editor"
                    path={config.path}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </>
              )}
              <Action.OpenWith
                title="Open Folder"
                path={path.dirname(config.path)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
              <Action
                title="Refresh List"
                onAction={loadConfigs}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              {config.exists && (
                <Action
                  title="Delete"
                  onAction={() => handleQuickDelete(config)}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
      {configs.length === 0 && (
        <List.EmptyView
          title="No Configs Found"
          description="Add configs in settings or create files in the Xray folder"
          actions={
            <ActionPanel>
              <Action.OpenWith title="Open Xray Folder" path={getXrayPathLocal()} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

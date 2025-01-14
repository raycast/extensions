import { Action, ActionPanel, Detail, Icon, environment, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import fs from "fs/promises";
import path from "node:path";
import { ConfigForm } from "./views/config/form";
import { useMcp } from "./hooks/useMcp";

const configPath = path.join(environment.supportPath, "config.json");

export default function Command() {
  const [configContent, setConfigContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { loadConfig: reloadMcpConfig } = useMcp();

  const loadConfig = useCallback(async () => {
    try {
      const content = await fs.readFile(configPath, "utf-8");
      setConfigContent(JSON.stringify(JSON.parse(content), null, 2));
    } catch (error) {
      if ((error as { code?: string }).code === "ENOENT") {
        // File doesn't exist, create empty config
        await fs.writeFile(configPath, JSON.stringify({}, null, 2));
        setConfigContent("{}");
      } else {
        console.error("Error reading config:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error reading config",
          message: String(error),
        });
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = useCallback(async () => {
    await loadConfig();
    await reloadMcpConfig();
  }, [loadConfig, reloadMcpConfig]);

  const markdown = `\`\`\`json
${configContent}
\`\`\``;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open Config File" target={configPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action.CopyToClipboard
              title="Copy Config Path"
              content={configPath}
              onCopy={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Copied config path to clipboard",
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

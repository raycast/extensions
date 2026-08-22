import { ActionPanel, Action, List, Icon, Color, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { checkAllSystemTools } from "./utils/system";
import { SystemToolStatus } from "./engines/types";

export default function CheckToolsCommand() {
  const [tools, setTools] = useState<SystemToolStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function runDiagnostics() {
      setIsLoading(true);
      const results = await checkAllSystemTools();
      setTools(results);
      setIsLoading(false);
    }
    runDiagnostics();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Compression Engine Diagnostics">
      <List.Section title="Installed Compression Engines & Dependencies">
        {tools.map((tool) => (
          <List.Item
            key={tool.name}
            icon={{
              source: tool.available ? Icon.CheckCircle : Icon.XMarkCircle,
              tintColor: tool.available ? Color.Green : Color.Red,
            }}
            title={tool.name}
            subtitle={tool.version}
            accessories={[
              {
                text: tool.available ? "Available" : "Missing / Action Needed",
                icon: tool.available ? Icon.Check : Icon.ExclamationMark,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Information">
                  <Action
                    title="Copy Tool Info"
                    icon={Icon.CopyClipboard}
                    onAction={async () => {
                      await Clipboard.copy(`${tool.name}: ${tool.version}\n${tool.notes}`);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Copied Info",
                      });
                    }}
                  />
                  {!tool.available && (
                    <Action
                      title="Copy Install Command (winget/brew)"
                      icon={Icon.Terminal}
                      onAction={async () => {
                        const cmd = process.platform === "win32" ? "winget install Gyan.FFmpeg" : "brew install ffmpeg";
                        await Clipboard.copy(cmd);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Copied Installation Command",
                          message: cmd,
                        });
                      }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

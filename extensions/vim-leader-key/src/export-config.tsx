import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { exportConfigToJson } from "./storage";
import { writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export default function ExportConfig() {
  const [json, setJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const exported = await exportConfigToJson();
      setJson(exported);
      setIsLoading(false);
    }
    load();
  }, []);

  async function copyToClipboard() {
    await Clipboard.copy(json);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }

  async function saveToDownloads() {
    try {
      const downloadsPath = join(
        homedir(),
        "Downloads",
        "leader-key-config.json",
      );
      writeFileSync(downloadsPath, json, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Downloads",
        message: "leader-key-config.json",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message,
      });
    }
  }

  const markdown = isLoading
    ? "Loading..."
    : `# Leader Key Config\n\nThis config is compatible with the [Leader Key app](https://github.com/mikker/LeaderKey).\n\n\`\`\`json\n${json}\n\`\`\``;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" onAction={copyToClipboard} />
          <Action title="Save to Downloads" onAction={saveToDownloads} />
        </ActionPanel>
      }
    />
  );
}

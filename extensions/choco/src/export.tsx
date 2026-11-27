import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { access, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { useMemo, useState } from "react";
import { generatePackagesConfigXml } from "./choco/parser";
import { ChocoErrorView } from "./components/ChocoErrorView";
import { useInstalledPackages } from "./hooks/useChocoData";

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export default function ExportPackagesCommand() {
  const [includeVersions, setIncludeVersions] = useState(true);
  const {
    data: installed = [],
    isLoading,
    error,
    revalidate,
  } = useInstalledPackages();

  const xmlContent = useMemo(
    () => generatePackagesConfigXml(installed, includeVersions),
    [installed, includeVersions],
  );

  if (error) {
    return <ChocoErrorView error={error} onRetry={revalidate} />;
  }

  async function saveToDesktop() {
    const filePath = path.join(os.homedir(), "Desktop", "packages.config");
    try {
      if (await fileExists(filePath)) {
        const confirmed = await confirmAlert({
          title: "Overwrite existing packages.config?",
          message: `${filePath} already exists on your Desktop.`,
          primaryAction: {
            title: "Overwrite",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) {
          return;
        }
      }

      await writeFile(filePath, xmlContent, "utf8");
      await showToast({
        style: Toast.Style.Success,
        title: "Saved packages.config",
        message: filePath,
      });
      await showInFinder(filePath);
    } catch (err) {
      await showFailureToast(err, { title: "Failed to save packages.config" });
    }
  }

  const markdown = [
    `# Export Installed Packages (${installed.length})`,
    "",
    "Restore on another Windows machine with:",
    "```powershell",
    "choco install packages.config -y",
    "```",
    "",
    "```xml",
    xmlContent.trimEnd(),
    "```",
  ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Packages.Config XML"
            content={xmlContent}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Save to Desktop as Packages.Config"
            icon={Icon.SaveDocument}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={saveToDesktop}
          />
          <Action
            title={
              includeVersions
                ? "Exclude Version Numbers"
                : "Include Version Numbers"
            }
            icon={Icon.Switch}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "v" },
              Windows: { modifiers: ["ctrl"], key: "v" },
            }}
            onAction={() => setIncludeVersions((prev) => !prev)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}

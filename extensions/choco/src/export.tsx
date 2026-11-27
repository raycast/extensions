import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showInFinder,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { useMemo, useState } from "react";
import { generatePackagesConfigXml } from "./choco/parser";
import { ChocoErrorView } from "./components/ChocoErrorView";
import { useInstalledPackages } from "./hooks/useChocoData";

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
      await writeFile(filePath, xmlContent, "utf8");
      await showToast({
        style: Toast.Style.Success,
        title: "Saved packages.config",
        message: filePath,
      });
      await showInFinder(filePath);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save packages.config",
        message: err instanceof Error ? err.message : String(err),
      });
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
          />
          <Action
            title="Save to Desktop as Packages.Config"
            icon={Icon.SaveDocument}
            onAction={saveToDesktop}
          />
          <Action
            title={
              includeVersions
                ? "Exclude Version Numbers"
                : "Include Version Numbers"
            }
            icon={Icon.Switch}
            shortcut={{ modifiers: ["ctrl"], key: "v" }}
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

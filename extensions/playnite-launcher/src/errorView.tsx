import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { PlayniteError, PlayniteErrorCode } from "./errors";

const DetailContent = {
  PLAYNITE_NOT_FOUND: `
# Playnite Not Found

Playnite's directory could not be found on your system.

- [Download Playnite](https://playnite.link/) if you haven't installed it yet.
- If you use a portable installation, please select the Playnite data directory in the extension settings.
`,
  EXTENSION_MISSING: `
# Playnite Extension Required

This extension requires the **FlowLauncherExporter** plugin for Playnite.

**To install:**
1. [Download the latest FlowLauncherExporter .pext file](https://github.com/Garulf/FlowLauncherExporter/releases/latest)
2. Open the file in Playnite and confirm installation

_Tip: You may need to update your Playnite library for your games to appear here._
`.trim(),
} as const;

export function ErrorView({ error }: { error: Error }) {
  const isPlayniteError = error instanceof PlayniteError;

  if (isPlayniteError) {
    if (error.code === PlayniteErrorCode.PLAYNITE_PATH_INVALID) {
      return (
        <Detail
          markdown={DetailContent.PLAYNITE_NOT_FOUND}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Playnite" icon={Icon.Download} url={"https://playnite.link/"} />
              <Action
                title="Open Preferences"
                icon={Icon.Cog}
                onAction={async () => await openExtensionPreferences()}
              />
            </ActionPanel>
          }
        />
      );
    }

    if (error.code === PlayniteErrorCode.EXTENSION_MISSING) {
      return (
        <Detail
          markdown={DetailContent.EXTENSION_MISSING}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Get The FlowLauncherExporter Plugin"
                icon={Icon.Download}
                url="https://github.com/Garulf/FlowLauncherExporter/releases/latest"
              />
            </ActionPanel>
          }
        />
      );
    }

    return <Detail markdown={`# Error\n\n${error.extra !== undefined ? error.extra : "Unknown error"}`} />;
  }

  return <Detail markdown={`# Error\n\n${error.message}`} />;
}

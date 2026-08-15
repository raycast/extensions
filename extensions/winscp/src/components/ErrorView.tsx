import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { WinSCPError, WinSCPErrorCode } from "../errors";

const DetailContent = {
  WINSCP_NOT_FOUND: `
# WinSCP Not Found

This extension could not find \`WinSCP.exe\` in any of the default installation folders.

If WinSCP is installed somewhere else, set the **WinSCP Installation Folder** preference to the folder that contains \`WinSCP.exe\`.

- [Download WinSCP](https://winscp.net/eng/download.php)
`,
  REGISTRY_READ_FAILED: `
# Could Not Read Your Sessions

WinSCP is storing its sessions in the Windows registry, but reading them failed:

\`\`\`
{message}
\`\`\`

You can work around this by having WinSCP store its sessions in a file instead:

1. Open WinSCP.
2. Go to \`Options\` > \`Preferences\` > \`Storage\`.
3. Select \`INI file (WinSCP.ini)\`.

The extension reads that file directly, without going through the registry.
`,
} as const;

export function ErrorView({ error }: { error: Error }) {
  if (error instanceof WinSCPError && error.code === WinSCPErrorCode.WINSCP_NOT_FOUND) {
    return (
      <Detail
        markdown={DetailContent.WINSCP_NOT_FOUND}
        actions={
          <ActionPanel>
            <Action title="Set Installation Folder" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Get Winscp" icon={Icon.Download} url={"https://winscp.net/eng/download.php"} />
          </ActionPanel>
        }
      />
    );
  }

  if (error instanceof WinSCPError && error.code === WinSCPErrorCode.REGISTRY_READ_FAILED) {
    return (
      <Detail
        markdown={DetailContent.REGISTRY_READ_FAILED.replace("{message}", error.extra ?? "Unknown error")}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Error" content={error.extra ?? error.message} />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown={`# Error\n\n${error.message}`} />;
}

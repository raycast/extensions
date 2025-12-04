import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { WinSCPError, WinSCPErrorCode } from "../errors";

const DetailContent = {
  WINSCP_NOT_FOUND: `
# WinSCP Not Found or Not Configured

This extension requires WinSCP to be installed and to use an INI file for configuration.

**To enable INI file storage:**
1. Open WinSCP.
2. Go to \`Options\` > \`Preferences\`.
3. Under \`Storage\`, select \`INI file (WinSCP.ini)\`.
4. Ensure the INI file is in the default location (\`%APPDATA%\\WinSCP.ini\`).

- [Download WinSCP](https://winscp.net/eng/download.php)
`,
} as const;

export function ErrorView({ error }: { error: Error }) {
  if (error instanceof WinSCPError && error.code === WinSCPErrorCode.WINSCP_NOT_FOUND) {
    return (
      <Detail
        markdown={DetailContent.WINSCP_NOT_FOUND}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Get Winscp" icon={Icon.Download} url={"https://winscp.net/eng/download.php"} />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown={`# Error\n\n${error.message}`} />;
}

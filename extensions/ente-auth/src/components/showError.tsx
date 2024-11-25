import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { LINE_BREAK } from "../constants/string";

const SUBMIT_ISSUE =
  "https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2Cbug&template=extension_bug_report.yml&title=%5BEnte%20Auth%5D+...";
const ENTE_CLI_INSTALLATION_URL = "https://github.com/ente-io/ente/tree/main/cli#readme";

type Messages = string | number | false | 0 | "" | null | undefined;

export function showError() {
  const localCliPath = getPreferenceValues<Preferences>().cliPath;

  const messages: Messages[] = [];

  messages.push("# ⚠️ Ente Auth CLI not found");
  messages.push(
    `Could not find the [Ente Auth CLI](${ENTE_CLI_INSTALLATION_URL}) installed on your machine \`${localCliPath}\`.`,
  );
  messages.push(
    "> Please read the `Setup` section in the [extension's description](https://github.com/raycast/extensions/blob/main/extensions/ente-auth/README.md) to ensure that everything is properly configured.",
  );
  messages.push(`**If the issue persists, consider [reporting a bug on GitHub](${SUBMIT_ISSUE}).**`);

  return (
    <Detail
      markdown={messages.filter(Boolean).join(LINE_BREAK)}
      actions={
        <ActionPanel>
          <>
            <Action.OpenInBrowser title="Open Guide" url={ENTE_CLI_INSTALLATION_URL} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </>
        </ActionPanel>
      }
    />
  );
}

export default showError;

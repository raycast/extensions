import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openCommandPreferences,
} from "@raycast/api";
import { CLI_DOCS } from "../lib/word-replacements";

export function ConnectionError({
  message,
  retry,
}: {
  message: string;
  retry: () => Promise<void>;
}) {
  return (
    <Detail
      markdown={`# Spokenly CLI needs attention\n\n${message.replace(/[\\`*_<>]/g, "\\$&")}\n\n1. Update Spokenly to a version with the official CLI.\n2. In Spokenly, open **Settings → Install CLI**.\n3. Keep Spokenly running and choose **Retry Connection**.\n\nIf you use a different CLI location, choose it in this command’s preferences. Your replacements are read from Spokenly when the connection succeeds.`}
      actions={
        <ActionPanel>
          <Action
            title="Retry Connection"
            icon={Icon.ArrowClockwise}
            onAction={retry}
          />
          <Action.OpenInBrowser title="Read CLI Setup Guide" url={CLI_DOCS} />
          <Action
            title="Command Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { CLI_DOCS } from "../lib/replacements";

export function ConnectionError({
  message,
  retry,
}: {
  message: string;
  retry: () => Promise<void>;
}) {
  return (
    <Detail
      navigationTitle="Connect Spokenly CLI"
      markdown={`# Spokenly CLI needs attention\n\n${message.replace(/[\\`*_<>]/g, "\\$&")}\n\n1. Update Spokenly to a version with the official CLI.\n2. In Spokenly, open **Settings → Install CLI**.\n3. Keep Spokenly running and choose **Retry Connection**.\n\nIf you use a different CLI location, set its absolute path in this extension’s preferences. Your replacements are read from Spokenly when the connection succeeds.`}
      actions={
        <ActionPanel>
          <Action
            title="Retry Connection"
            icon={Icon.ArrowClockwise}
            onAction={retry}
          />
          <Action.OpenInBrowser title="Read CLI Setup Guide" url={CLI_DOCS} />
          <Action
            title="Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}

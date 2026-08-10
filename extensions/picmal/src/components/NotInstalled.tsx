import { Action, ActionPanel, Detail } from "@raycast/api";
import { PICMAL_WEBSITE } from "../lib/cli";

const MARKDOWN = `# Picmal isn’t installed

This extension converts and compresses files using the **Picmal** app's bundled
tools, so Picmal needs to be installed on this Mac.

1. Download and install Picmal.
2. Make sure it has been launched at least once.
3. Reopen this command.

Picmal also requires an active license to convert and compress.
`;

/** Shown instead of the form when Picmal.app can't be located. */
export function NotInstalled() {
  return (
    <Detail
      markdown={MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get Picmal" url={PICMAL_WEBSITE} />
        </ActionPanel>
      }
    />
  );
}

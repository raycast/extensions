import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { errorMessage, recoveryHint } from "../lib/errors";
import { markdownText } from "../utils/device-status";

export const SETUP_URL = "https://ghosthand.dev/#setup-once-per-iphone";

export function SetupActions() {
  return (
    <>
      <Action.OpenInBrowser title="Open Setup Instructions" url={SETUP_URL} icon={Icon.Book} />
      <Action.CopyToClipboard title="Copy Setup Command" content="ghosthand setup" icon={Icon.Clipboard} />
    </>
  );
}

export function ErrorView({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <Detail
      markdown={`# Ghosthand needs attention\n\n${markdownText(errorMessage(error))}\n\n${recoveryHint(error)}`}
      actions={
        <ActionPanel>
          {retry && <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={retry} />}
          <SetupActions />
          <Action.OpenInBrowser
            title="View Ghosthand Plans"
            url="https://ghosthand.dev/docs/pricing"
            icon={Icon.CreditCard}
          />
        </ActionPanel>
      }
    />
  );
}

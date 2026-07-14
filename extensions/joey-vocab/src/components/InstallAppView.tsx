import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { APP_STORE_URL } from "../constants";

interface InstallAppViewProps {
  onContinue: () => void;
}

const WELCOME_MARKDOWN = `# Welcome to Joey! 🎉

Your account is ready.

To finish setting up — pick a username, build your profile, and start
learning — install the **Joey** app on your iPhone or iPad.

You can keep adding vocabulary cards from Raycast, and they'll sync straight
to your decks in the app.`;

/**
 * Post-signup nudge encouraging new users to install the Joey mobile app.
 *
 * Shown only after a brand-new sign-up, never for returning sign-ins.
 */
export function InstallAppView({ onContinue }: InstallAppViewProps) {
  return (
    <Detail
      markdown={WELCOME_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Install Joey on the App Store" icon={Icon.Mobile} url={APP_STORE_URL} />
          <Action title="Continue" icon={Icon.ArrowRight} onAction={onContinue} />
        </ActionPanel>
      }
    />
  );
}

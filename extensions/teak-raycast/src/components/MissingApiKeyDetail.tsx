import { Action, ActionPanel, Detail } from "@raycast/api";
import { TEAK_SETTINGS_URL } from "../lib/constants";
import { SetApiKeyAction } from "./SetApiKeyAction";
import { SignInWithBrowserAction } from "./SignInWithBrowserAction";

interface MissingApiKeyDetailProps {
  error?: string | null;
  onSignedIn?: () => void;
}

export function MissingApiKeyDetail({
  onSignedIn,
  error,
}: MissingApiKeyDetailProps) {
  if (error) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action onAction={onSignedIn} title="Retry Connection" />
          </ActionPanel>
        }
        markdown={`# Connection unavailable\n\n${error}`}
      />
    );
  }
  return (
    <Detail
      actions={
        <ActionPanel>
          <SignInWithBrowserAction onSignedIn={onSignedIn} />
          <SetApiKeyAction />
          <Action.OpenInBrowser
            title="Open Teak Settings"
            url={TEAK_SETTINGS_URL}
          />
        </ActionPanel>
      }
      markdown={[
        "# Sign in to Teak",
        "",
        "Sign in with your browser to start saving and searching cards. No API key required.",
        "",
        "Prefer an API key? Use **Set API Key** to open extension preferences and paste one from **Teak Settings → Manage API Keys**.",
      ].join("\n")}
    />
  );
}

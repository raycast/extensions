import { Action, ActionPanel, Detail, environment } from "@raycast/api";
import { SetRaycastKeyAction } from "./SetRaycastKeyAction";

const SETTINGS_URL = environment.isDevelopment
  ? "http://localhost:3000/settings"
  : "https://app.teakvault.com/settings";

export function MissingApiKeyDetail() {
  return (
    <Detail
      actions={
        <ActionPanel>
          <SetRaycastKeyAction />
          <Action.OpenInBrowser title="Open Teak Settings" url={SETTINGS_URL} />
        </ActionPanel>
      }
      markdown={[
        "# API key required",
        "",
        "Create an API key in **Teak Settings > API Keys** and add it to Raycast preferences.",
        "",
        "Use **Set API Key** to open extension preferences instantly.",
      ].join("\n")}
    />
  );
}

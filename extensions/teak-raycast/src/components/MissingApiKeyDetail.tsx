import { Action, ActionPanel, Detail } from "@raycast/api";
import { TEAK_SETTINGS_URL } from "../lib/constants";
import { SetApiKeyAction } from "./SetApiKeyAction";

export function MissingApiKeyDetail() {
  return (
    <Detail
      actions={
        <ActionPanel>
          <SetApiKeyAction />
          <Action.OpenInBrowser
            title="Open Teak Settings"
            url={TEAK_SETTINGS_URL}
          />
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

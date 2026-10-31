import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";

export default function RequireOpenAIKey({ children }: { children: ReactNode }) {
  if (getPreferenceValues<Preferences>().apiKey?.trim()) return <>{children}</>;
  return (
    <Detail
      markdown="## OpenAI API Key required\n\nAdd your OpenAI API Key in extension preferences, then reopen this command. To use another provider, open **Generate or Edit Image** instead."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

import { Action, getPreferenceValues } from "@raycast/api";

const { use_sandbox } = getPreferenceValues<Preferences>();
export default function OpenInAutumnAction({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="autumn-logo.png"
      title="Open in Autumn"
      url={`https://app.useautumn.com/${use_sandbox ? "sandbox" : ""}/${route}`}
    />
  );
}

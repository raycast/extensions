import { Action, getPreferenceValues, Keyboard } from "@raycast/api";
import { chatwoot } from "./chatwoot";

const { account_id } = getPreferenceValues<Preferences>();
export default function OpenInChatwoot({ route }: { route: string }) {
  const url = chatwoot.buildUrl(`app/accounts/${account_id}/${route}`).toString();
  return (
    <Action.OpenInBrowser
      icon="chatwoot.png"
      title="Open in Chatwoot"
      url={url}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

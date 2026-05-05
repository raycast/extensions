import { Action, getPreferenceValues, Keyboard } from "@raycast/api";

const { paymenter_url } = getPreferenceValues<Preferences>();
export default function OpenInPaymenter({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="paymenter.png"
      title="Open in Paymenter"
      url={new URL(`admin/${route}`, paymenter_url).toString()}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

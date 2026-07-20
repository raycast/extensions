import { Action, getPreferenceValues, Keyboard } from "@raycast/api";

const { siteUrl } = getPreferenceValues<Preferences>();
export function OpenInInfisical({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="infisical.png"
      title="Open in Infisical"
      url={new URL(route, siteUrl).toString()}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

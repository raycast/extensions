import { Action, getPreferenceValues, Keyboard } from "@raycast/api";

const { company_id } = getPreferenceValues<Preferences>();
export const buildSevallaUrl = (route: string) => `https://app.sevalla.com/${route}?idCompany=${company_id}`;
export default function OpenInSevallaAction({ title = "Open in Sevalla", route }: { title?: string; route: string }) {
  return (
    <Action.OpenInBrowser
      icon="sevalla-orange.png"
      title={title}
      url={buildSevallaUrl(route)}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

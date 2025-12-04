import { Action, getPreferenceValues, Keyboard } from "@raycast/api";

const { workspace_slug } = getPreferenceValues<Preferences>();
export default function OpenInAttio({ route }: { route: string }) {
  const url = `https://app.attio.com/${workspace_slug}/${route}`;
  return <Action.OpenInBrowser title="Open in Attio" url={url} shortcut={Keyboard.Shortcut.Common.Open} />;
}

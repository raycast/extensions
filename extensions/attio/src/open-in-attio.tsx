import { Action, getPreferenceValues, Keyboard } from "@raycast/api";

const { workspace_slug } = getPreferenceValues<Preferences>();
type OpenInAttioProps =
  | {
      route: string;
      url?: never;
    }
  | {
      route?: never;
      url: string;
    };
export default function OpenInAttio(props: OpenInAttioProps) {
  const url = props.url ?? `https://app.attio.com/${workspace_slug}/${props.route}`;
  return (
    <Action.OpenInBrowser icon="attio.png" title="Open in Attio" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
  );
}

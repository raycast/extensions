import { Action, Keyboard } from "@raycast/api";
import { useSelf } from "./hooks/useSelf";

type OpenInAttioProps = { route: string; url?: never } | { route?: never; url: string };

export default function OpenInAttio(props: OpenInAttioProps) {
  const { workspace } = useSelf();
  const url = props.url ?? (workspace ? `https://app.attio.com/${workspace.slug}/${props.route}` : undefined);
  if (!url) return null; // slug not resolved yet; action appears on next render
  return (
    <Action.OpenInBrowser icon="attio.png" title="Open in Attio" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
  );
}

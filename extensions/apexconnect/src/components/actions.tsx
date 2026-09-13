import { apex } from "@lib/common";
import { Action, Image, Keyboard } from "@raycast/api";

export function HAOpenUrlInAction(props: {
  url: string;
  action?: string;
  title?: string;
  icon?: Image.ImageLike;
  shortcut?: Keyboard.Shortcut | undefined;
}) {
  const url = props.url;
  const isCompanion = apex.isCompanionUrl(url);
  const app = isCompanion ? "Companion" : "Browser";
  const action = props.action ? props.action : "Open In";
  const title = `${action} ${app}`;
  const icon = isCompanion ? "apex-connect.png" : undefined;
  return (
    <Action.OpenInBrowser
      url={url}
      title={props.title ? props.title : title}
      icon={props.icon ? props.icon : icon}
      shortcut={props.shortcut}
    />
  );
}

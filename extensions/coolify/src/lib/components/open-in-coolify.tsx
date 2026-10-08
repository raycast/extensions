import { Action, Image, Keyboard } from "@raycast/api";
import { generateCoolifyUrl } from "../utils";

export default function OpenInCoolify(props: { icon?: Image.ImageLike; title?: string; url: string }) {
  return (
    <Action.OpenInBrowser
      icon={props.icon || "coolify.png"}
      title={props.title || "Open in Coolify"}
      url={generateCoolifyUrl(props.url).toString()}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

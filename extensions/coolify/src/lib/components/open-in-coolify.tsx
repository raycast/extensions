import { Action } from "@raycast/api";
import { generateCoolifyUrl } from "../utils";

export default function OpenInCoolify(props: { url: string }) {
  return (
    <Action.OpenInBrowser icon="coolify.png" title="Open in Coolify" url={generateCoolifyUrl(props.url).toString()} />
  );
}

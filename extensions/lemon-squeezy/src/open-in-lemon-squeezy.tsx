import { Action } from "@raycast/api";

export default function OpenInLemonSqueezy({
  title = "Open in Lemon Squeezy",
  route,
}: {
  title?: string;
  route: string;
}) {
  return <Action.OpenInBrowser icon="extension_icon.png" title={title} url={`https://app.lemonsqueezy.com/${route}`} />;
}

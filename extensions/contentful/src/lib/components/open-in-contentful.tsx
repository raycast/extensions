import { Action } from "@raycast/api";

export default function OpenInContentful({ url }: { url: string }) {
  return <Action.OpenInBrowser icon="contentful-favicon.png" title="Open in Contentful" url={url} />;
}

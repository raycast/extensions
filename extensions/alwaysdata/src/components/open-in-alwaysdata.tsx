import { Action } from "@raycast/api";

export default function OpenInAlwaysdata({ path }: { path: string }) {
  return (
    <Action.OpenInBrowser
      icon="alwaysdata.png"
      title="Open in Alwaysdata"
      url={`https://admin.alwaysdata.com/${path}/`}
    />
  );
}

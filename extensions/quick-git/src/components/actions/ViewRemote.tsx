import { Action } from "@raycast/api";

interface Props {
  url: string;
}

export function ViewRemote({ url }: Props) {
  return <Action.OpenInBrowser title="View Remote Repo" url={url} />;
}

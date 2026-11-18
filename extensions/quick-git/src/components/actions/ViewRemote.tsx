import { Action } from "@raycast/api";
import { convertSSHtoHTTP } from "../../utils/url.js";
import { memo } from "react";

interface Props {
  url: string;
}

export const ViewRemote = memo(function ViewRemote({ url }: Props) {
  return <Action.OpenInBrowser title="View Remote Repo" url={convertSSHtoHTTP(url)} />;
});

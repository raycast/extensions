import { Action } from "@raycast/api";

import { isLinearInstalled } from "../helpers/isLinearInstalled";

type OpenInLinearProps = {
  url: string;
  title?: string;
} & (Action.Open.Props | Action.OpenInBrowser.Props);

export default function OpenInLinear({ title, url, ...props }: OpenInLinearProps) {
  return isLinearInstalled ? (
    <Action.Open
      title={`${title ? title : "Open"} in Linear`}
      icon="linear-app-icon.png"
      target={url}
      application="Linear"
      {...props}
    />
  ) : (
    <Action.OpenInBrowser url={url} title={`${title ? title : "Open"} in Browser`} />
  );
}

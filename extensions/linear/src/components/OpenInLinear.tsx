import { Action } from "@raycast/api";
import { isLinearInstalled } from "../helpers/isLinearInstalled";

type OpenInLinearProps = {
  url: string;
  title?: string;
};

export default function OpenInLinear({ title, url }: OpenInLinearProps) {
  return isLinearInstalled ? (
    <Action.Open title={`${title ? title : "Open"} in Linear`} icon="linear.png" target={url} application="Linear" />
  ) : (
    <Action.OpenInBrowser url={url} title={`${title ? title : "Open"} in Browser`} />
  );
}

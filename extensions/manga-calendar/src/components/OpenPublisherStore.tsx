import { Action } from "@raycast/api";
import { getNormalizedParameter } from "../utils/normalize";

interface Props {
  publisher: string;
  title: string;
  storeUrl: string;
}

export function OpenPublisherStore({ publisher, title, storeUrl }: Props) {
  return (
    <Action.OpenInBrowser title={publisher} url={storeUrl.replace("{param}", getNormalizedParameter(title, "+"))} />
  );
}

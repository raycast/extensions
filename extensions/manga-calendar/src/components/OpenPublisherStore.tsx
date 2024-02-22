import { Action } from "@raycast/api";
import { normalizeURL } from "@utils/normalizeUrl";

interface Props {
  publisher: string;
  title: string;
  storeUrl: string;
}

export function OpenPublisherStore({ publisher, title, storeUrl }: Props) {
  return <Action.OpenInBrowser title={publisher} url={storeUrl.replace("{param}", normalizeURL(title, "+"))} />;
}

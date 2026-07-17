import { Action } from "@raycast/api";

import type { Hit } from "@/types";

export default function ImagePageOpenInBrowserAction(props: { hit: Hit }): JSX.Element {
  return <Action.OpenInBrowser url={props.hit.pageURL} />;
}

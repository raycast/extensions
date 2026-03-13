import { Action } from "@raycast/api";

import type { VideoHit } from "@/types";

export default function VideoPageOpenInBrowserAction(props: { hit: VideoHit }): JSX.Element {
  return <Action.OpenInBrowser url={props.hit.pageURL} />;
}

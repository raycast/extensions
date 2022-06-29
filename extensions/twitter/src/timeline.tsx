import { ReactElement } from "react";
import { useV2 } from "./common";
import { HomeTimelineList } from "./v1/components/timeline";
import { HomeTimelineListV2 } from "./v2/components/timeline";

export default function HomeTimelineRoot(): ReactElement {
  if (useV2()) {
    return <HomeTimelineListV2 />;
  } else {
    return <HomeTimelineList />;
  }
}

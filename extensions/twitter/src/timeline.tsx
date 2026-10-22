import { withXAuth } from "./v2/lib/with_x_auth";
import { ReactElement } from "react";
import "./v2/components/register-post-views";
import { HomeTimelineListV2 } from "./v2/components/timeline";

function HomeTimelineRoot(): ReactElement {
  return <HomeTimelineListV2 />;
}

export default withXAuth(HomeTimelineRoot);

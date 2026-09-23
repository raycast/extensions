import { withXAuth } from "./v2/lib/with_x_auth";
import { ReactElement } from "react";
import { TweetSendThreadFormV2 } from "./v2/components/send";

function SendTweetRoot({ launchContext }: { launchContext?: { defaultValue: string } }): ReactElement {
  return <TweetSendThreadFormV2 defaultValue={launchContext?.defaultValue} />;
}

export default withXAuth(SendTweetRoot);

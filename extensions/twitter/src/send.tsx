import { ReactElement } from "react";
import { TweetSendThreadFormV2 } from "./v2/components/send";

export default function SendTweetRoot({ launchContext }: { launchContext?: { defaultValue: string } }): ReactElement {
  return <TweetSendThreadFormV2 defaultValue={launchContext?.defaultValue} />;
}

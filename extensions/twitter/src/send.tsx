import { ReactElement } from "react";
import { useV2 } from "./common";
import { TweetSendThreadForm } from "./v1/components/send";
import { TweetSendThreadFormV2 } from "./v2/components/send";

export default function SendTweetRoot(): ReactElement {
  if (useV2()) {
    return <TweetSendThreadFormV2 />;
  } else {
    return <TweetSendThreadForm />;
  }
}

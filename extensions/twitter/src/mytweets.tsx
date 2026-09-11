import { withXAuth } from "./v2/lib/with_x_auth";
import { MyTweetListV2 } from "./v2/components/mytweets";

function MyTweetRoot() {
  return <MyTweetListV2 />;
}

export default withXAuth(MyTweetRoot);

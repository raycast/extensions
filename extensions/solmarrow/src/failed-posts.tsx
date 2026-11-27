import { withAccessToken } from "@raycast/utils";
import { solmarrow } from "./api";
import { PostList } from "./post-list";

function FailedPosts() {
  return <PostList kind="failed" />;
}

export default withAccessToken(solmarrow)(FailedPosts);

import { withAccessToken } from "@raycast/utils";
import { solmarrow } from "./api";
import { PostList } from "./post-list";

function UpcomingPosts() {
  return <PostList kind="upcoming" />;
}

export default withAccessToken(solmarrow)(UpcomingPosts);

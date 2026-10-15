import { AuthorTweetList } from "./author";
import { TweetDetail } from "./detail";
import { PostEngagementList } from "./engagement";
import { registerPostViewTargets } from "./post-view-targets";
import { TweetSendForm, TweetSendThreadFormV2 } from "./send";

registerPostViewTargets({
  showDetail: (props) => (
    <TweetDetail tweet={props.tweet} fetcher={props.fetcher} canModerateReply={props.canModerateReply} />
  ),
  reply: (tweet) => <TweetSendForm replyTweet={tweet} />,
  quote: (postId) => <TweetSendThreadFormV2 quotePostId={postId} />,
  engagement: (postId, kind) => <PostEngagementList postId={postId} kind={kind} />,
  authorTweets: (authorID) => <AuthorTweetList authorID={authorID} />,
});

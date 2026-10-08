import { withXAuth } from "./v2/lib/with_x_auth";
import { Icon } from "@raycast/api";
import { TweetList } from "./v2/components/tweet";
import "./v2/components/register-post-views";
import { clientV2 } from "./v2/lib/twitterapi_v2";
import { useTweetPage } from "./v2/lib/tweet-page";

function MentionsCommand() {
  const { tweets, error, isLoading, pagination, fetcher } = useTweetPage(
    (_value, cursor) => clientV2.mentions(cursor),
    null,
    "Could not load mentions",
  );

  return (
    <TweetList
      tweets={tweets}
      error={error}
      isLoading={isLoading}
      fetcher={fetcher}
      pagination={pagination}
      searchBarPlaceholder="Filter mentions..."
      emptyViewTitle="No Mentions Found"
      emptyViewIcon={Icon.AtSymbol}
      emptyViewDescription="Posts that mention your X account will appear here."
    />
  );
}

export default withXAuth(MentionsCommand);

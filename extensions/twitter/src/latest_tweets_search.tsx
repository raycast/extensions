import { ReactElement } from "react";
import { SearchListV2, SEARCH_TYPE } from "./v2/components/search";

const searchBarPlaceholder = "Search Latest Tweets";

export default function LatestTweetsSearchRoot(): ReactElement {
  return <SearchListV2 searchBarPlaceholder={searchBarPlaceholder} searchType={SEARCH_TYPE.LATEST_TWEETS} />;
}

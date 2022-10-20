import { ReactElement } from "react";
import { SearchListV2, SEARCH_TYPE } from "./v2/components/search";

const searchBarPlaceholder = "Search Top Tweets";

export default function TopTweetsSearchRoot(): ReactElement {
  return <SearchListV2 searchBarPlaceholder={searchBarPlaceholder} searchType={SEARCH_TYPE.TOP_TWEETS} />;
}

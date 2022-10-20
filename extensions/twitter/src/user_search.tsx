import { ReactElement } from "react";
import { useV2 } from "./common";
import { UserList } from "./v1/components/user_search";
import { SearchListV2, SEARCH_TYPE } from "./v2/components/search";

const searchBarPlaceholder = "Search Users by Name or Handle (e.g. @tonka_2000 or Michael Aigner)";

export default function UserSearchRoot(): ReactElement {
  if (useV2()) {
    return <SearchListV2 searchBarPlaceholder={searchBarPlaceholder} searchType={SEARCH_TYPE.USER} />;
  } else {
    return <UserList />;
  }
}

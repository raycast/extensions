import { ReactElement } from "react";
import { useV2 } from "./common";
import { UserList } from "./v1/components/user_search";
import { SearchUserListV2 } from "./v2/components/user_search";

export default function UserSearchRoot(): ReactElement {
  if (useV2()) {
    return <SearchUserListV2 />;
  } else {
    return <UserList />;
  }
}

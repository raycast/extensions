import { withXAuth } from "./v2/lib/with_x_auth";
import { ReactElement } from "react";
import { SearchUserListV2 } from "./v2/components/user_search";

function UserSearchRoot(): ReactElement {
  return <SearchUserListV2 />;
}

export default withXAuth(UserSearchRoot);

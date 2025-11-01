import { plane } from "../api/auth";

import { withAccessToken } from "@raycast/utils";

function AuthorizedView({ children }: { children: React.ReactNode }) {
  return children;
}

export default withAccessToken(plane)(AuthorizedView);

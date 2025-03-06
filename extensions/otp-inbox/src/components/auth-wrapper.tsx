// import withGmailAuth from "../lib/with-gmail-auth";
import { authorize } from "../lib/gmail-oauth";
import { withAccessToken } from "@raycast/utils";

/**
 * Makes sure that we have a authenticated gmail client available in the children
 */
function AuthWrapper({ children }: { children: JSX.Element }) {
  return <>{children}</>;
}

export default withAccessToken({ authorize })(AuthWrapper);

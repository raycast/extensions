import { useEffect } from "react";
import { checkLinearApp } from "../helpers/isLinearInstalled";
import { withAccessToken } from "@raycast/utils";
import { linear } from "../api/linearClient";

/**
 * Makes sure that we have a authenticated linear client available in the children
 */
function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkLinearApp();
  }, []);

  return children;
}

export default withAccessToken(linear)(View);

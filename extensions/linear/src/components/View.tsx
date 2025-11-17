import { withAccessToken } from "@raycast/utils";
import { useEffect } from "react";

import { linear } from "../api/linearClient";
import { checkLinearApp } from "../helpers/isLinearInstalled";

/**
 * Makes sure that we have a authenticated linear client available in the children
 */
function View({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    checkLinearApp();
  }, []);

  return children;
}

export default withAccessToken(linear)(View);

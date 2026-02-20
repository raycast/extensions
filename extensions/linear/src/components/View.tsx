import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";

import { linear } from "../api/linearClient";
import { resolveActiveClient } from "../api/resolveActiveClient";
import { checkLinearApp } from "../helpers/isLinearInstalled";

/**
 * Makes sure that we have an authenticated linear client available in the children.
 * Resolves the active workspace (OAuth or PAT) before rendering.
 */
function View({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkLinearApp();
    resolveActiveClient().then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return children;
}

export default withAccessToken(linear)(View);

import { withAccessToken } from "@raycast/utils";

import { bootstrapWorkspaceAuth } from "./linearClient";

// Reuses the utils wrapper engine (component suspension + async-fn gating) with our
// bootstrap as the authorizer. The one-token-per-process cache inside withAccessToken
// is safe here: one process = one launch = one pinned active workspace (design D2);
// AI tools run one call per process (spike S8). Non-active workspaces NEVER go
// through this path — they use getLinearClientFor (§4.4).
const workspaceAuthorizer = {
  authorize: async () => {
    const { token } = await bootstrapWorkspaceAuth();
    return token;
  },
};

export const withWorkspaceAuth = withAccessToken(workspaceAuthorizer);

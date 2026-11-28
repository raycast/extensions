import { requirePlaneClient } from "../api/auth";
import { getMe } from "../api/users";
import { withPlane } from "../helpers/with-plane";

/** Returns the current Plane user and the selected workspace. */
export default withPlane(async () => {
  const client = requirePlaneClient();
  const me = await getMe();
  return {
    id: me.id,
    displayName: me.displayName,
    name: [me.firstName, me.lastName].filter(Boolean).join(" ") || undefined,
    email: me.email,
    workspace: client.workspaceSlug,
  };
});

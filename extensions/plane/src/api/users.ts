import { UserLite } from "@makeplane/plane-node-sdk";
import { planeClient, requirePlaneClient } from "./auth";

export async function getCurrentUser(): Promise<UserLite | undefined> {
  const response = await planeClient?.usersApi.getCurrentUser();
  return response;
}

let mePromise: Promise<UserLite> | undefined;

/** Current user, fetched once per command run (the user doesn't change between workspaces). */
export function getMe(): Promise<UserLite> {
  if (!mePromise) {
    mePromise = requirePlaneClient()
      .usersApi.getCurrentUser()
      .catch((error) => {
        mePromise = undefined;
        throw error;
      });
  }
  return mePromise;
}

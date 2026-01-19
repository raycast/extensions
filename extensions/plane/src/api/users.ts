import { UserLite } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export async function getCurrentUser(): Promise<UserLite | undefined> {
  const response = await planeClient?.usersApi.getCurrentUser();
  return response;
}

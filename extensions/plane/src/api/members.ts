import { UserLite } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export async function getProjectMembers({ projectId }: { projectId: string }): Promise<UserLite[] | undefined> {
  const response = await planeClient?.membersApi.getProjectMembers({ projectId, slug: planeClient?.workspaceSlug });
  return response;
}

export async function getWorkspaceMembers(): Promise<UserLite[] | undefined> {
  const response = await planeClient?.membersApi.getWorkspaceMembers({ slug: planeClient?.workspaceSlug });
  return response;
}

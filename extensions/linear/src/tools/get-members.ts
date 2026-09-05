import { User } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type MemberResult = Pick<User, "id" | "description" | "displayName" | "email" | "isMe" | "name" | "url">;

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const allMembers: MemberResult[] = [];
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const members = await linearClient.users({
      after: endCursor,
      first: 100,
    });
    allMembers.push(
      ...members.nodes.map((member) => ({
        id: member.id,
        name: member.name,
        description: member.description,
        displayName: member.displayName,
        isMe: member.isMe,
        url: member.url,
        email: member.email,
      })),
    );
    hasNextPage = members.pageInfo.hasNextPage;
    endCursor = members.pageInfo.endCursor;
  }

  return allMembers;
});

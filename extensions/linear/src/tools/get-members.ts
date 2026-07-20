import { User } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

export type MemberResult = Pick<User, "id" | "description" | "displayName" | "email" | "isMe" | "name" | "url">;

export default withAccessToken(linear)(async () => {
  const { linearClient } = getLinearClient();

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

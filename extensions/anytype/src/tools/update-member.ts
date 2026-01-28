import { Tool } from "@raycast/api";
import { getMember, getSpace, updateMember } from "../api";
import { MemberRole, MemberStatus } from "../models";
import { formatMemberRole } from "../utils";

//! Member management not enabled yet
type Input = {
  /**
   * The unique identifier of the space to update the member role in.
   * This value can be obtained from the `getSpaces` tool.
   * */
  spaceId: string;

  /**
   * The unique identity of the member to update the role of (note: this is different from the id, which has a prefix `_participant`).
   * This value can be obtained from the `get-members` tool.
   */
  memberIdentity: string;

  /**
   * The new role to assign to the member.
   */
  role: MemberRole.Viewer | MemberRole.Editor;
};

/**
 * Update the role of an active member in a space.
 */
export default async function tool({ spaceId, memberIdentity, role }: Input) {
  const response = await updateMember(spaceId, memberIdentity, {
    status: MemberStatus.Active,
    role: role,
  });

  if (!response.member) {
    throw new Error("Failed to update member");
  }

  return {
    object: response.member.object,
    name: response.member.name,
    id: response.member.id,
    identity: response.member.identity,
    global_name: response.member.global_name,
    status: response.member.status,
    role: response.member.role,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const s = await getSpace(input.spaceId);
  const m = await getMember(input.spaceId, input.memberIdentity);
  return {
    message: `Are you sure you want to change the role of ${m.member?.name} to ${formatMemberRole(input.role)}?`,
    info: [
      {
        name: "Space",
        value: s.space.name,
      },
      {
        name: "Name",
        value: m.member.name,
      },
      {
        name: "New Role",
        value: formatMemberRole(input.role),
      },
    ],
  };
};

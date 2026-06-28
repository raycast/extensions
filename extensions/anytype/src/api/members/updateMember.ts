import { mapMember } from "../../mappers/members";
import { Member, RawMember, UpdateMemberRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

//! Member management not enabled yet
export async function updateMember(
  spaceId: string,
  memberId: string,
  request: UpdateMemberRequest,
): Promise<{ member: Member }> {
  const { url, method } = apiEndpoints.updateMember(spaceId, memberId);

  const response = await apiFetch<{ member: RawMember }>(url, {
    method: method,
    body: JSON.stringify(request),
  });

  return { member: await mapMember(response.payload.member) };
}

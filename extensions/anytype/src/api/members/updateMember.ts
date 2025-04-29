import { mapMember } from "../../mappers/members";
import { Member, RawMember, UpdateMemberRequest } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

//! Member management not enabled yet
export async function updateMember(
  spaceId: string,
  memberId: string,
  data: UpdateMemberRequest,
): Promise<{
  member: Member | null;
}> {
  const { url, method } = apiEndpoints.updateMember(spaceId, memberId);

  const response = await apiFetch<{ member: RawMember }>(url, {
    method: method,
    body: JSON.stringify(data),
  });

  return {
    member: response ? await mapMember(response.payload.member) : null,
  };
}

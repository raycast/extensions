import { mapMember } from "../../mappers/members";
import { Member, RawMember } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getMember(
  spaceId: string,
  objectId: string,
): Promise<{
  member: Member | null;
}> {
  const { url, method } = apiEndpoints.getMember(spaceId, objectId);
  const response = await apiFetch<{ member: RawMember }>(url, { method: method });
  return {
    member: response ? await mapMember(response.payload.member) : null,
  };
}

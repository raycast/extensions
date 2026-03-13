import { Member, ObjectLayout, RawMember } from "../models";
import { getIconWithFallback, getNameWithFallback } from "../utils";

/**
 * Map raw `Member` objects from the API into display-ready data (e.g., icon).
 * @param members The raw `Member` objects from the API.
 * @returns The display-ready `Member` objects.
 */
export async function mapMembers(members: RawMember[]): Promise<Member[]> {
  return Promise.all(
    members.map(async (member) => {
      return mapMember(member);
    }),
  );
}

/**
 * Map a raw `Member` object from the API into display-ready data (e.g., icon).
 * @param member The raw `Member` object from the API.
 * @returns The display-ready `Member` object.
 */
export async function mapMember(member: RawMember): Promise<Member> {
  const icon = await getIconWithFallback(member.icon, ObjectLayout.Participant);

  return {
    ...member,
    name: getNameWithFallback(member.name),
    icon,
  };
}

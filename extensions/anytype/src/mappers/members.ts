import { Icon } from "@raycast/api";
import { Member } from "../helpers/schemas";
import { getIcon } from "../helpers/icon";

/**
 * Map raw `Member` objects from the API into display-ready data (e.g., icon).
 */
export async function mapMembers(members: Member[]): Promise<Member[]> {
  return Promise.all(
    members.map(async (member) => {
      const icon = (await getIcon(member.icon)) || Icon.PersonCircle;
      return {
        ...member,
        name: member.name || "Untitled",
        icon,
      };
    }),
  );
}

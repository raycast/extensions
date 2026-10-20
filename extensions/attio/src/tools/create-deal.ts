import type { Tool } from "@raycast/api";
import { createRecord, listAttributeStatuses, listMembers } from "../api/endpoints";

type Input = {
  /** The deal's name, e.g. "Acme Corp — Enterprise plan". */
  name: string;
  /**
   * The deal stage. Must exactly match a stage title configured in the
   * workspace (use whatever the user said; common defaults are "Lead",
   * "In Progress", "Won 🎉", "Lost"). Omit to use the workspace default.
   */
  stage?: string;
  /** The deal value as a plain number, e.g. 5000. */
  value?: number;
  /**
   * Full name or email of the workspace member who owns the deal. Attio
   * usually requires an owner — ask the user if they didn't specify one.
   */
  owner?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this deal in Attio?",
  info: [
    { name: "Name", value: input.name },
    ...(input.stage ? [{ name: "Stage", value: input.stage }] : []),
    ...(input.value !== undefined ? [{ name: "Value", value: String(input.value) }] : []),
    ...(input.owner ? [{ name: "Owner", value: input.owner }] : []),
  ],
});

/** Create a new deal record in Attio. A deal needs a name; Attio also requires an owner and defaults the stage. */
export default async function tool(input: Input) {
  const values: Record<string, unknown[]> = { name: [input.name] };
  if (input.stage) {
    // Resolve case-insensitively against real stage titles so "won" matches
    // "Won 🎉" — but only when the prefix is unambiguous.
    const q = input.stage.toLowerCase();
    const stages = (await listAttributeStatuses("deals", "stage")).data.filter((s) => !s.is_archived);
    const exact = stages.find((s) => s.title.toLowerCase() === q);
    const prefixed = stages.filter((s) => s.title.toLowerCase().startsWith(q));
    if (!exact && prefixed.length > 1)
      throw new Error(
        `"${input.stage}" matches several stages (${prefixed.map((s) => s.title).join(", ")}) — ask the user which one.`,
      );
    values.stage = [exact?.title ?? prefixed[0]?.title ?? input.stage];
  }
  if (input.value !== undefined) values.value = [input.value];
  if (input.owner) {
    const q = input.owner.toLowerCase();
    if (q.includes("@")) {
      // Attio resolves member emails directly — no user_management:read needed.
      values.owner = [{ workspace_member_email_address: input.owner }];
    } else {
      const { data: members } = await listMembers();
      const matches = members.filter((x) => `${x.first_name} ${x.last_name}`.trim().toLowerCase() === q);
      if (matches.length === 0)
        throw new Error(`No workspace member matches "${input.owner}" — ask the user which member owns the deal.`);
      if (matches.length > 1)
        throw new Error(
          `Several workspace members are named "${input.owner}" (${matches
            .map((x) => x.email_address)
            .filter(Boolean)
            .join(", ")}) — ask the user for the owner's email.`,
        );
      values.owner = [
        { referenced_actor_type: "workspace-member", referenced_actor_id: matches[0].id.workspace_member_id },
      ];
    }
  }
  const { data } = await createRecord("deals", { data: { values } });
  return { record_id: data.id.record_id, url: data.web_url };
}

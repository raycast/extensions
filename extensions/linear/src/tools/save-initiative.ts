import { addParentInitiatives, initiativeInput, InitiativeUpdateInput, serializeInitiative } from "./initiativeUtils";
import { applyPatch, client, ContentPatch, resolveInitiative } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  id?: string;
  name?: string;
  summary?: string;
  description?: string;
  patch?: {
    op: "replace" | "insert_before" | "insert_after" | "prepend" | "append" | "replace_range";
    old_string?: string;
    new_string?: string;
    replace_all?: boolean;
    anchor?: string;
    text?: string;
    from?: string;
    to?: string;
  }[];
  color?: string;
  icon?: string;
  status?: string;
  priority?: number;
  targetDate?: string;
  /** User ID, name, email, me, or the literal string null to remove the owner. */
  owner?: string;
  /** Team name, key, ID, or the literal string null to remove the lead team. */
  leadTeam?: string;
  parentInitiatives?: string[];
  labels?: string[];
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
  const existing = input.id ? await resolveInitiative(input.id) : undefined;
  if (!existing && !input.name) throw new Error("name is required when creating an initiative.");
  if (input.description !== undefined && input.patch) throw new Error("Pass description or patch, not both.");
  const description = input.patch
    ? applyPatch(existing?.content ?? "", input.patch as ContentPatch[])
    : input.description;
  const resolved = await initiativeInput({
    ...input,
    description,
    owner: input.owner === "null" ? null : input.owner,
    leadTeam: input.leadTeam === "null" ? null : input.leadTeam,
  });
  let initiative;
  if (existing) {
    const result = await client().updateInitiative(existing.id, resolved as InitiativeUpdateInput);
    if (!result.success || !result.initiative) throw new Error("Failed to update initiative.");
    initiative = await result.initiative;
  } else {
    const result = await client().createInitiative({ ...resolved, name: input.name! });
    if (!result.success || !result.initiative) throw new Error("Failed to create initiative.");
    initiative = await result.initiative;
  }
  await addParentInitiatives(initiative, input.parentInitiatives);
  return serializeInitiative(initiative);
});

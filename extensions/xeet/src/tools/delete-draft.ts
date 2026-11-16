import type { Tool } from "@raycast/api";
import { deleteDraft, loadDraft } from "../lib/storage";

type Input = {
  /** Exact draft ID returned by list-drafts. */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async ({ id }) => {
  const draft = await loadDraft(id);
  return { message: "Delete this saved draft?", info: [{ name: "Draft", value: draft.title }] };
};

/** Delete a local saved draft after Raycast's confirmation. Does not delete already exported PNGs. */
export default async function remove({ id }: Input) {
  await deleteDraft(id);
  return { deleted: true, id };
}

import { open, Tool } from "@raycast/api";
import { buildCreateDocumentUrl, loadCraftSnapshot, resolveSpaceId } from "../lib/aiTools";

type Input = {
  /** Title of the new document. */
  title: string;
  /** Optional markdown body of the new document. */
  content?: string;
  /** Space ID to create the document in. Omit for the primary space. */
  spaceId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this document in Craft?",
  info: [
    { name: "Title", value: input.title },
    { name: "Content", value: input.content },
  ],
});

/** Create a new document in Craft and open it. */
export default async function (input: Input) {
  const { config } = await loadCraftSnapshot();
  const spaceId = resolveSpaceId(config, input.spaceId);

  await open(buildCreateDocumentUrl(spaceId, input.title, input.content));

  return `Created "${input.title}" in ${config.getSpaceDisplayName(spaceId)}.`;
}

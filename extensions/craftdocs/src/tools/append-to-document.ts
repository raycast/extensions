import { open, Tool } from "@raycast/api";
import { buildCreateBlockUrl, loadCraftSnapshot, resolveSpaceId } from "../lib/aiTools";

type Input = {
  /** ID of the document to write to (documentId from search-blocks). */
  documentId: string;
  /** Space ID the document lives in (spaceId from search-blocks). Omit for the primary space. */
  spaceId?: string;
  /** Markdown content to add. */
  content: string;
  /** Where to add the content. Defaults to the end. */
  position?: "beginning" | "end";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Add this content to the Craft document?",
  info: [
    { name: "Content", value: input.content },
    { name: "Position", value: input.position ?? "end" },
  ],
});

/** Add content to an existing Craft document. */
export default async function (input: Input) {
  const { config } = await loadCraftSnapshot();
  const spaceId = resolveSpaceId(config, input.spaceId);

  await open(
    buildCreateBlockUrl({ parentBlockId: input.documentId, spaceId, content: input.content, position: input.position }),
  );

  return "Content added to the document.";
}

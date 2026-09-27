import { Tool } from "@raycast/api";
import { TinkererCommunity } from "../api/community";
import { getApiClient } from "../api/preferences";
import { unwrapPayload } from "../lib/json";

type Input = {
  /** Whether to add or remove the reaction. */
  action: "add" | "remove";
  /** Emoji reaction to add. Required when action is add. */
  reaction?: string;
  /** Exact post or comment ID. */
  targetId: string;
  /** Kind of club item receiving the reaction. */
  targetType: "post" | "comment";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${input.action === "add" ? "Add" : "Remove"} a reaction on this ${input.targetType}?`,
  info: [
    { name: "Target", value: `${input.targetType} ${input.targetId}` },
    { name: "Action", value: input.action },
    ...(input.reaction ? [{ name: "Reaction", value: input.reaction }] : []),
  ],
});

export default async function react(input: Input) {
  const targetId = input.targetId.trim();
  const reaction = input.reaction?.trim();
  if (!targetId) throw new Error("A target ID is required.");
  if (input.action === "add" && !reaction) throw new Error("A reaction is required when adding a reaction.");

  const community = new TinkererCommunity(getApiClient());
  const result =
    input.targetType === "post"
      ? input.action === "add"
        ? await community.reactToPost(targetId, reaction as string)
        : await community.removePostReaction(targetId, reaction)
      : input.action === "add"
        ? await community.reactToComment(targetId, reaction as string)
        : await community.removeCommentReaction(targetId);

  return unwrapPayload(result);
}

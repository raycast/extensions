import { Tool } from "@raycast/api";
import { createHeadline } from "../api/ninety";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Team Id from get-teams. */
  teamId: string;
  /** The Headline itself, one sentence. */
  title: string;
  /** Optional details (plain text). */
  description?: string;
  /** true to create a Cascading Message instead of a Headline. */
  cascadingMessage?: boolean;
};

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function tool(input: Input) {
  const headline = await createHeadline({
    teamId: input.teamId,
    title: input.title,
    description: input.description ? `<p>${escapeHtml(input.description)}</p>` : undefined,
    isCascadedMessage: input.cascadingMessage ?? false,
  });
  return {
    id: headline.id,
    title: headline.title,
    isCascadedMessage: headline.isCascadedMessage,
    url: NinetyUrls.headline({ id: headline.id, teamId: headline.teamId ?? input.teamId }),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.cascadingMessage ? "Send this Cascading Message?" : "Share this Headline?",
  info: [
    { name: "Headline", value: input.title },
    { name: "Details", value: input.description },
  ],
});

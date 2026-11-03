import { Tool } from "@raycast/api";
import { createIssue } from "../api/ninety";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Team Id from get-teams. Issues always belong to a Team. */
  teamId: string;
  /** The Issue title. */
  title: string;
  /** Optional details. */
  description?: string;
  /** Short-Term (discussed this week) or Long-Term (parking lot). Defaults to Short-Term. */
  interval?: "SHORT_TERM" | "LONG_TERM";
  /** Optional priority 1-5, where 5 is highest. */
  priority?: number;
};

export default async function tool(input: Input) {
  const issue = await createIssue({
    teamId: input.teamId,
    title: input.title,
    description: input.description,
    interval: input.interval ?? "SHORT_TERM",
    priority: input.priority,
  });
  return {
    id: issue.id,
    title: issue.title,
    list: issue.intervalCode,
    url: NinetyUrls.issue({ ...issue, teamId: issue.teamId ?? input.teamId }),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Add this Issue in Ninety?",
  info: [
    { name: "Title", value: input.title },
    { name: "List", value: input.interval === "LONG_TERM" ? "Long-Term" : "Short-Term" },
    { name: "Priority", value: input.priority ? String(input.priority) : undefined },
  ],
});

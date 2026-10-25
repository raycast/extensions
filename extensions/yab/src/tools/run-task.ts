import { getPreferenceValues, Tool } from "@raycast/api";
import { cli } from "../yab";

type Input = {
  /** The whole task in the user's words, with what it needs (sites, dates, names). */
  task: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Hand this to Yab's agent? It works in Yab, signed in as you.",
  info: [{ name: "Task", value: input.task }],
});

/** Hand a task to Yab's own browser agent, which signs in, reads and acts on sites as the user, and answer what it found. */
export default async function tool(input: Input) {
  const { access } = getPreferenceValues<{ access?: string }>();
  const { stdout, code } = await cli(
    [input.task, "--access", access || "browser", "--wait-person", "5"],
    15 * 60 * 1000,
  );
  const answer = stdout.split("\n\n").slice(1).join("\n\n").trim() || stdout.trim();
  if (code === 3) return `Yab needs the user in its window to go on (a sign-in or a yes). ${answer}`;
  if (code !== 0) return `The task didn't finish. ${answer}`;
  return answer;
}

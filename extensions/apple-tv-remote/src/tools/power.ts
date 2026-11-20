import { Tool } from "@raycast/api";
import { ACTIONS } from "../lib/actions";
import { withConnection } from "../lib/connection";

type Input = {
  /** "sleep" to put the Apple TV to sleep, "wake" to wake it up */
  action: "sleep" | "wake";
};

/**
 * Put the Apple TV to sleep or wake it up.
 */
export default async function (input: Input): Promise<string> {
  const sleep = input.action === "sleep";
  await withConnection(ACTIONS[sleep ? "sleep" : "wake"].run);
  return sleep ? "Apple TV is going to sleep." : "Waking up the Apple TV.";
}

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  input.action === "sleep" ? { message: "Put the Apple TV to sleep?" } : undefined;

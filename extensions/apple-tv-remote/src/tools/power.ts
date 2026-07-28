import { Tool } from "@raycast/api";
import { withConnection } from "../lib/connection";
import { showErrorToast } from "../lib/errors";
import { sleepDevice, wakeDevice } from "../lib/companion-extras";

type Input = {
  /** "sleep" to put the Apple TV to sleep, "wake" to wake it up */
  action: "sleep" | "wake";
};

/**
 * Put the Apple TV to sleep or wake it up.
 */
export default async function (input: Input): Promise<string> {
  try {
    return await withConnection(async (conn) => {
      if (input.action === "sleep") {
        await sleepDevice(conn);
        return "Apple TV is going to sleep.";
      }
      await wakeDevice(conn);
      return "Waking up the Apple TV.";
    });
  } catch (e) {
    await showErrorToast(e);
    throw e;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.action !== "sleep") {
    return undefined;
  }
  return { message: "Put the Apple TV to sleep?" };
};

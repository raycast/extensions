import { applyAvailability, presenceResultMessage } from "../api/presence";

type Input = {
  /** The presence to set for the signed-in user. */
  availability: "Available" | "Busy" | "DoNotDisturb" | "BeRightBack" | "Away" | "Offline";
};

/**
 * Sets the Microsoft Teams presence of the signed-in user.
 */
export default async function (input: Input) {
  // Set without a HUD; the AI reports the result itself.
  await applyAvailability(input.availability);
  return presenceResultMessage(input.availability);
}

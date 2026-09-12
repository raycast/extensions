import { Tool } from "@raycast/api";
import { Availability, setAvailability } from "../api/presence";

type Input = {
  /** Presence to use, or Default to clear the manually selected presence. */
  availability: Availability | "Default";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message:
      input.availability === "Default"
        ? "Clear your manually selected Microsoft Teams presence?"
        : `Set your Microsoft Teams presence to ${input.availability}?`,
  };
};

export default async function tool(input: Input) {
  await setAvailability(input.availability === "Default" ? undefined : input.availability, false);
  return input.availability === "Default"
    ? "Cleared the manually selected presence"
    : `Set presence to ${input.availability}`;
}

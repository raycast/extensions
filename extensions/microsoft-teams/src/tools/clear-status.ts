import { Tool } from "@raycast/api";
import { clearStatus } from "../api/status";

type Input = Record<string, never>;

export const confirmation: Tool.Confirmation<Input> = async () => {
  return {
    message: "Clear your Microsoft Teams status message?",
  };
};

export default async function tool() {
  await clearStatus();
  return "Cleared the Microsoft Teams status message";
}

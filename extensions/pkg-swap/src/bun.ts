import { convertCommand } from "./lib/converter";
import { showFailureToast } from "@raycast/utils";

export default async function command() {
  try {
    await convertCommand("npm", "bun");
  } catch (error) {
    await showFailureToast("Failed to convert to bun", error);
  }
}

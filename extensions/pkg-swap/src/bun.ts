import { convertCommand } from "./lib/converter";

export default async function command() {
  try {
    await convertCommand("npm", "bun");
  } catch (error) {
    await showFailureToast("Failed to convert to bun", error);
  }
}

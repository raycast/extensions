import { Tool } from "@raycast/api";
import { reloadModels } from "../lib/omlx";

export const confirmation: Tool.Confirmation<
  Record<string, never>
> = async () => ({
  message: "Rescan the model directory?",
});

export default async function () {
  const message = await reloadModels();
  return { success: true, message };
}

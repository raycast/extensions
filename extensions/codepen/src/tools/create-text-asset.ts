import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = { /** Unique filename, without slashes. */ filename: string; content: string };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Upload “${input.filename}” to CodePen Asset Hosting?`,
  info: [{ name: "Content", value: input.content }],
});
export default function tool(input: Input) {
  return getClient().saveTextAsset(input.filename, input.content);
}

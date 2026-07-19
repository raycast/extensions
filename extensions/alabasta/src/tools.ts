import { Tool } from "@raycast/api";
import { api } from "./api";
export const confirmation: Tool.Confirmation<Record<string, unknown>> = async (
  input,
) => ({
  message: `Confirm Alabasta change: ${Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ")}`,
});
export async function call(path: string, input: Record<string, unknown>) {
  return api(path, input);
}

import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";

type Input = {
  penId: string;
  /** New title, or the current title returned by Get Pen. */
  title: string;
  description?: string;
  /** Replaces all tags when provided. */
  tags?: string[];
  access?: "Public" | "Private" | "Protected" | "Collaborators";
  /** Required when changing to Protected; omit to keep an existing password. */
  password?: string;
  template?: boolean;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Update Pen “${input.title}”?`,
  info: [
    { name: "Pen ID", value: input.penId },
    { name: "Privacy", value: input.access ?? "Keep current" },
    { name: "Description", value: input.description },
    { name: "Tags", value: input.tags?.join(", ") },
  ],
});
export default function tool({ penId, ...details }: Input) {
  return getClient().updatePen(penId, details);
}

import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = {
  penId: string;
  title: string;
  /** Use the source Pen’s access to preserve its privacy. Protected requires a new password. */
  access: "Public" | "Private" | "Protected" | "Collaborators";
  /** Required for Protected access. Ask the user for a password of at least 8 characters before calling; never invent one. */
  password?: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Fork this Pen as “${input.title}”?`,
  info: [
    { name: "Source Pen ID", value: input.penId },
    { name: "Privacy", value: input.access },
  ],
});
/**
 * Call get-pen first to read the source Pen's editor and access.
 * Classic Pens cannot be forked. Preserve access unless the user explicitly requests a change.
 * If the source is Protected and the user has not supplied a new password, ask them for one
 * and stop. Do not call this tool yet, invent a password, or change access to avoid the password.
 */
export default function tool({ penId, ...details }: Input) {
  return getClient().forkPen(penId, details);
}

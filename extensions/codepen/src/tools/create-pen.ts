import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";

type Input = {
  title: string;
  description?: string;
  tags?: string[];
  /** Omit to use the account’s default privacy. Non-Public requires PRO. */
  access?: "Public" | "Private" | "Protected" | "Collaborators";
  /** Required for Protected access. At least 8 characters. */
  password?: string;
  template?: boolean;
  /** Omit for CodePen starter files. Supply complete source files, including HTML references to CSS and JS. */
  files?: { path: string; content: string }[];
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create “${input.title}” in CodePen?`,
  info: [
    { name: "Privacy", value: input.access ?? "Account default" },
    { name: "Files", value: input.files?.map((file) => file.path).join(", ") ?? "CodePen starter files" },
  ],
});
export default function tool({ files, ...details }: Input) {
  return getClient().createPen(details, files);
}

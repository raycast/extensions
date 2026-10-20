import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = {
  /** Omit to create; provide an existing collection ID to update. */
  collectionId?: string;
  title: string;
  description?: string;
  /** Non-Public requires PRO. Omit to keep current privacy, or use the account default for a new collection. */
  access?: "Public" | "Private";
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${input.collectionId ? "Update" : "Create"} collection “${input.title}”?`,
  info: [
    { name: "Collection ID", value: input.collectionId },
    { name: "Privacy", value: input.access ?? (input.collectionId ? "Keep current" : "Account default") },
  ],
});
export default function tool({ collectionId, ...details }: Input) {
  return getClient().saveCollection(details, collectionId);
}

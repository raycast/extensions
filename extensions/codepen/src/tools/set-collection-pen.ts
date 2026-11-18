import { Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = { collectionId: string; penId: string; action: "add" | "remove" };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message:
    input.action === "add"
      ? "Add this Pen to the collection?"
      : "Remove this Pen from the collection? The Pen itself will be kept.",
  info: [
    { name: "Pen ID", value: input.penId },
    { name: "Collection ID", value: input.collectionId },
  ],
});
export default async function tool(input: Input) {
  if (input.action === "add") return getClient().addToCollection(input.collectionId, input.penId);
  await getClient().removeFromCollection(input.collectionId, input.penId);
  return { collectionId: input.collectionId, penId: input.penId, removed: true };
}

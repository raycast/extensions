import { Action, Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = { collectionId: string };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Trash this collection? Its Pens will be kept. The collection can be restored on CodePen for 3 days.",
  style: Action.Style.Destructive,
  info: [{ name: "Collection ID", value: input.collectionId }],
});
export default async function tool({ collectionId }: Input) {
  await getClient().deleteCollection(collectionId);
  return { collectionId, trashed: true };
}

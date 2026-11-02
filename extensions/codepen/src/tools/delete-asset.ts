import { Action, Tool } from "@raycast/api";
import { getClient } from "../lib/api";
type Input = { assetId: string };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Permanently delete this asset? Existing links will stop working. This cannot be undone.",
  style: Action.Style.Destructive,
  info: [{ name: "Asset ID", value: input.assetId }],
});
export default async function tool({ assetId }: Input) {
  await getClient().deleteAsset(assetId);
  return { assetId, deleted: true };
}

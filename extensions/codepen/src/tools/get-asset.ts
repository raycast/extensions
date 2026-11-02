import { getClient } from "../lib/api";
type Input = { assetId: string };
export default function tool({ assetId }: Input) {
  return getClient().getAsset(assetId);
}

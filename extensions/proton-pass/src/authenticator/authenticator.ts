import type { ItemReference, ItemSummary } from "../items/item";
import type { ItemMetadataMap } from "../items/item-cache";
type TotpSource = { generateTotpCode(reference: ItemReference): Promise<string> };
export function createAuthenticator(source: TotpSource) {
  return {
    listCandidates(items: ItemSummary[], metadata: ItemMetadataMap) {
      return items.filter((item) => item.type === "login" && metadata[`${item.shareId}:${item.itemId}`]?.hasTotp);
    },
    generateCode: (reference: ItemReference) => source.generateTotpCode(reference),
  };
}

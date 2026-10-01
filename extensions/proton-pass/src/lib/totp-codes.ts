import { itemKey } from "./format";
import { Item } from "./types";

/** An item of Get TOTP, with its current code when it could be fetched. */
export interface TotpItem extends Item {
  currentTotp?: string;
  /** 30-second step the code was asked for in: it's only taken as valid during that step. */
  codeStep?: number;
}

/**
 * Applies codes refreshed from an earlier snapshot to the items shown now, which a load may have replaced
 * meanwhile: items are neither added back nor removed, a code asked for later is kept, and without a newer
 * code, the one shown stays only during its step.
 */
export function applyRefreshedCodes(shown: TotpItem[], refreshed: TotpItem[], step: number): TotpItem[] {
  const refreshedByKey = new Map(refreshed.map((item) => [itemKey(item), item]));
  return shown.map((item) => {
    const fresh = refreshedByKey.get(itemKey(item));
    if (fresh?.currentTotp !== undefined && (fresh.codeStep ?? 0) >= (item.codeStep ?? 0)) {
      return { ...item, currentTotp: fresh.currentTotp, codeStep: fresh.codeStep };
    }
    return item.codeStep === step ? item : { ...item, currentTotp: undefined, codeStep: undefined };
  });
}

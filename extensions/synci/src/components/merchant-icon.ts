import { Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { merchantLogo } from "../lib/merchant";
import { transactionName } from "../lib/format";
import type { Transaction } from "../lib/types";

export function merchantIcon(transactions: Transaction[]): Image.ImageLike {
  const logo = merchantLogo(transactions);
  const name = transactions[0] ? transactionName(transactions[0]).trim() : "";
  const fallback = name && name !== "Transaction" ? getAvatarIcon(name, { gradient: false }) : Icon.Building;
  return logo ? { source: logo, fallback, mask: Image.Mask.RoundedRectangle } : fallback;
}

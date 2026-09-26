import { Icon, Image } from "@raycast/api";
import { merchantLogo } from "../lib/merchant";
import type { Transaction } from "../lib/types";

export function merchantIcon(transactions: Transaction[]): Image.ImageLike {
  const logo = merchantLogo(transactions);
  return logo ? { source: logo, fallback: Icon.Building, mask: Image.Mask.RoundedRectangle } : Icon.Building;
}

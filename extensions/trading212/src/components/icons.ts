import { Color, type Image } from "@raycast/api";

/**
 * Custom row icons from assets/: drawn at ~75% of Raycast's icon slot, nudged toward the label, and
 * tinted like Raycast's secondary icons so they follow light/dark mode.
 */
function asset(source: string): Image.ImageLike {
  return { source, tintColor: Color.SecondaryText };
}

export const ICONS = {
  portfolio: asset("portfolio.svg"),
  dividends: asset("dividends.svg"),
  fee: asset("fee.svg"),
  deposit: asset("deposit.svg"),
  withdrawal: asset("withdrawal.svg"),
  netDeposited: asset("net-deposited.svg"),
  interest: asset("interest.svg"),
};

import { List } from "@raycast/api";
import { Account, AccountType } from "../../types";
import { accountTypeColors } from "../../data/constants";

export function getAccountAccessories(account: Account): List.Item.Accessory[] {
  const color = accountTypeColors[account.type];

  const panOrIban = account.type === AccountType.FOP ? account.iban : account.maskedPan[0];

  return account.title
    ? [{ text: panOrIban }, { tag: { value: account.type, color } }]
    : [{ tag: { value: account.type, color } }];
}

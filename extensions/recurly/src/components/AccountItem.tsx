import { List } from "@raycast/api";
import {Account} from "recurly";
import AccountDetail, {formatSubscriptionEmoji} from "./AccountDetail";

export default function AccountItem({account}: {account: Account}) {
  return <List.Item
    icon={formatSubscriptionEmoji(account)}
    title={account.email || account.id || "no email"}
    detail={<AccountDetail account={account} />}
  />
}
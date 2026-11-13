import { List } from "@raycast/api";
import { Account } from "../../types";
import { formatCurrency, getAccountAccessories, getFlagImage, getItemTitle } from "../../utils";
import { PinProps } from "../PinActionsSection";
import AccountActions from "./AccountActions";
import AccountDetail from "./AccountDetail";

export default function AccountListItem(props: {
  account: Account;
  ownerName?: string;
  isShowingDetail: boolean;
  pin: PinProps;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
  onEdit: (id: string, patch: Pick<Account, "title">) => void;
}) {
  const { account, ownerName, isShowingDetail, pin, onToggleDetails, onCopyTotal, onEdit } = props;

  return (
    <List.Item
      id={account.id}
      icon={getFlagImage(account.currency.code)}
      title={getItemTitle(account)}
      subtitle={formatCurrency(account.balance, account.currency.code)}
      detail={<AccountDetail account={account} />}
      accessories={!isShowingDetail ? getAccountAccessories(account) : undefined}
      actions={
        <AccountActions
          account={account}
          ownerName={ownerName}
          pin={pin}
          onToggleDetails={onToggleDetails}
          onCopyTotal={onCopyTotal}
          onEdit={onEdit}
        />
      }
    />
  );
}

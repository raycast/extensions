import { useRef, FC, ReactNode } from "react";
import { List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Monzo } from "@marceloclp/monzojs";

import { getBalance } from "../lib/actions";
import { formatCurrency, formatSortCode } from "../lib/formatting";

type AccountProps = { account: Monzo.Accounts.Account; actions?: ReactNode };
type RetailAccountProps = { account: Monzo.Accounts.RetailAccount };

export const AccountItem: FC<AccountProps> = ({ account, actions }) => {
  const icon = account.owners.length > 1 ? Icon.TwoPeople : Icon.Person;
  return (
    <List.Item
      title="Account"
      icon={{ tintColor: Color.Green, source: icon }}
      detail={<AccountDetail account={account} />}
      actions={actions}
    />
  );
};

const AccountDetail: FC<AccountProps> = ({ account }) => {
  const abortable = useRef<AbortController>();
  const { isLoading, data: balance } = useCachedPromise(getBalance, [account], {
    abortable,
  });

  if (!balance) {
    return <List.Item.Detail isLoading={isLoading} />;
  }

  const formattedBalance = formatCurrency(balance.balance, balance.currency);
  const formattedTotal = formatCurrency(
    balance.total_balance,
    balance.currency
  );
  const formattedSpend = formatCurrency(
    Math.abs(balance.spend_today),
    balance.currency
  );
  const ownersTitle = account.owners.length == 1 ? "Owner" : "Owners";
  const ownersValue = account.owners.map((o) => o.preferred_name).join(", ");

  const isUKRetailAccount =
    account.type == "uk_retail" || account.type == "uk_retail_joint";

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Balance"
            text={formattedBalance}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Total including pots"
            text={formattedTotal}
          />
          <List.Item.Detail.Metadata.Label
            title="Today's spend"
            text={formattedSpend}
          />
          {balance.local_currency && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Local currency"
                text={balance.local_currency}
              />
              <List.Item.Detail.Metadata.Label
                title="Exchange rate"
                text={formatCurrency(
                  balance.local_exchange_rate,
                  balance.local_currency
                )}
              />
            </>
          )}
          {isUKRetailAccount && (
            <UKRetailAccountDetails
              account={account as Monzo.Accounts.RetailAccount}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title={ownersTitle}
            text={ownersValue}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const UKRetailAccountDetails: FC<RetailAccountProps> = ({ account }) => {
  return (
    <>
      <List.Item.Detail.Metadata.Label
        title="Account number"
        text={account.account_number}
      />
      <List.Item.Detail.Metadata.Label
        title="Sort code"
        text={formatSortCode(account.sort_code)}
      />
    </>
  );
};

import { List } from "@raycast/api";
import { Account } from "../../types";
import { accountTypeColors } from "../../data/constants";
import { formatCurrency } from "../../utils";

export default function AccountDetail(props: { account: Account }) {
  const { account } = props;

  const hasTopUpPage = account.sendId && account.currency.code === "UAH";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="ID" text={account.id} />
          <List.Item.Detail.Metadata.Separator />

          {account.maskedPan.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Label title="Masked Pan" text={account.maskedPan[0]} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}

          <List.Item.Detail.Metadata.Label title="IBAN" text={account.iban} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item text={account.type} color={accountTypeColors[account.type]} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Currency"
            text={`${account.currency.flag} ${account.currency.code}, ${account.currency.name}`}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Balance"
            text={formatCurrency(account.balance, account.currency.code)}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Credit Limit"
            text={formatCurrency(account.creditLimit, account.currency.code)}
          />
          <List.Item.Detail.Metadata.Separator />

          {!!account.cashbackType && (
            <>
              <List.Item.Detail.Metadata.Label title="Cashback Type" text={account.cashbackType} />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}

          {hasTopUpPage && (
            <List.Item.Detail.Metadata.Link
              title="Top Up Page URL"
              text={`https://send.monobank.ua/${account.sendId}`}
              target={`https://send.monobank.ua/${account.sendId}`}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

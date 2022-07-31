import React from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import get from "lodash/get";
import { convertAmount, convertTimestampToDate, titleCase } from "../utils";
import { useStripeApi } from "../hooks";
import { ENDPOINTS } from "../enums";
import { withPropsContext } from "../components";
import { theme } from "../theme";

type BalanceTransactionResp = {
  id: string;
  amount: number;
  available_on: number;
  created: number;
  currency: string;
  description: string | null;
  fee: number;
  net: number;
  type: string;
  status: string;
};

type BalanceTransaction = {
  id: string;
  amount: number;
  available_on: string;
  created_at: string;
  currency: string;
  description: string | null;
  fee: number;
  net: number;
  type: string;
  status: string;
};

const resolveBalanceTransaction = ({
  amount = 0,
  currency = "",
  description = "",
  available_on,
  created,
  fee = 0,
  net = 0,
  ...rest
}: BalanceTransactionResp): BalanceTransaction => {
  const uppercaseCurrency = currency.toUpperCase();

  return {
    ...rest,
    available_on: convertTimestampToDate(available_on),
    created_at: convertTimestampToDate(created),
    amount: convertAmount(amount),
    currency: uppercaseCurrency,
    description,
    fee: convertAmount(fee),
    net: convertAmount(net),
  };
};

const resolveMetadataValue = (value: any) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  return "";
};

const BalanceTransactions = () => {
  const { isLoading, data: resp } = useStripeApi(ENDPOINTS.BALANCE_TRANSACTIONS);
  const balanceTransactions = get(resp, "data", []) as BalanceTransactionResp[];
  const formattedBalanceTransactions = balanceTransactions.map(resolveBalanceTransaction);

  const renderBalanceTransactions = (transaction: BalanceTransaction) => {
    const { amount, currency, id } = transaction;
    return (
      <List.Item
        key={id}
        title={`${currency} ${amount}`}
        icon={{ source: Icon.Receipt, tintColor: theme.colors.stripeBlue }}
        actions={
          <ActionPanel title="Copy">
            <Action.CopyToClipboard title="Copy Transaction ID" content={id} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Metadata" />
                <List.Item.Detail.Metadata.Separator />
                {Object.entries(transaction).map(([type, value]) => {
                  const resolvedValue = resolveMetadataValue(value);
                  if (!resolvedValue || !type) return null;

                  return <List.Item.Detail.Metadata.Label key={type} title={titleCase(type)} text={resolvedValue} />;
                })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Transactions">{formattedBalanceTransactions.map(renderBalanceTransactions)}</List.Section>
    </List>
  );
};

export default withPropsContext(BalanceTransactions);

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { convertAmount, convertTimestampToDate, titleCase, resolveMetadataValue } from "./utils";
import { useStripeApi } from "./hooks";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";
import { theme } from "./theme";

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

const resolveBalanceTransaction = (balanceTransaction: Stripe.BalanceTransaction): BalanceTransaction => {
  const resolvedBalanceTransaction: BalanceTransaction = {
    ...balanceTransaction,
    available_on: convertTimestampToDate(balanceTransaction.available_on),
    created_at: convertTimestampToDate(balanceTransaction.created),
    amount: convertAmount(balanceTransaction.amount),
    currency: balanceTransaction.currency.toUpperCase(),
    description: balanceTransaction.description ?? "",
    fee: convertAmount(balanceTransaction.fee),
    net: convertAmount(balanceTransaction.net),
  };

  return resolvedBalanceTransaction;
};

const BalanceTransactions = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.BALANCE_TRANSACTIONS, true);
  const formattedBalanceTransactions = (data as Stripe.BalanceTransaction[]).map(resolveBalanceTransaction);

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
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Transactions">{formattedBalanceTransactions.map(renderBalanceTransactions)}</List.Section>
    </ListContainer>
  );
};

export default withEnvContext(BalanceTransactions);

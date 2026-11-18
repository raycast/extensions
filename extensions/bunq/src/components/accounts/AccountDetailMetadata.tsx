/**
 * Account detail metadata component for the List detail view.
 */

import { List, Color } from "@raycast/api";
import type { MonetaryAccount, Payment } from "../../api/endpoints";
import { formatCurrency } from "../../lib/formatters";
import { getBalanceColor } from "../../lib/status-helpers";
import { getPaymentCounterparty } from "./account-helpers";

interface AccountDetailMetadataProps {
  account: MonetaryAccount;
  recentPayments: Payment[] | undefined;
  isLoadingPayments: boolean;
}

export function AccountDetailMetadata({ account, recentPayments, isLoadingPayments }: AccountDetailMetadataProps) {
  const balance = formatCurrency(account.balance.value, account.balance.currency);
  const iban = account.alias.find((a) => a.type === "IBAN")?.value || "N/A";

  // Get limits information
  const dailyLimit = account.daily_limit;
  const dailySpent = account.daily_spent;
  const hasLimits = dailyLimit || dailySpent;

  // Calculate remaining if we have both values
  let remaining: string | null = null;
  if (dailyLimit && dailySpent) {
    const limitValue = parseFloat(dailyLimit.value);
    const spentValue = parseFloat(dailySpent.value);
    const remainingValue = limitValue - spentValue;
    remaining = formatCurrency(remainingValue.toFixed(2), dailyLimit.currency);
  }

  return (
    <List.Item.Detail
      isLoading={isLoadingPayments}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Account" text={account.description} />
          <List.Item.Detail.Metadata.Label title="IBAN" text={iban} />
          <List.Item.Detail.Metadata.Label
            title="Balance"
            text={{ value: balance, color: getBalanceColor(account.balance.value) }}
          />
          <List.Item.Detail.Metadata.Label title="Currency" text={account.currency} />
          <List.Item.Detail.Metadata.Label title="Status" text={account.status} />
          {hasLimits && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Daily Limits" />
              {dailyLimit && (
                <List.Item.Detail.Metadata.Label
                  title="Daily Limit"
                  text={formatCurrency(dailyLimit.value, dailyLimit.currency)}
                />
              )}
              {dailySpent && (
                <List.Item.Detail.Metadata.Label
                  title="Daily Spent"
                  text={{ value: formatCurrency(dailySpent.value, dailySpent.currency), color: Color.Orange }}
                />
              )}
              {remaining && (
                <List.Item.Detail.Metadata.Label
                  title="Remaining Today"
                  text={{ value: remaining, color: Color.Green }}
                />
              )}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Recent Transactions" />
          {recentPayments?.slice(0, 5).map((payment) => {
            const amount = formatCurrency(payment.amount.value, payment.amount.currency);
            const isIncoming = parseFloat(payment.amount.value) > 0;
            const counterparty = getPaymentCounterparty(payment);
            return (
              <List.Item.Detail.Metadata.Label
                key={payment.id}
                title={counterparty}
                text={{ value: isIncoming ? `+${amount}` : amount, color: getBalanceColor(payment.amount.value) }}
              />
            );
          })}
          {!isLoadingPayments && (!recentPayments || recentPayments.length === 0) && (
            <List.Item.Detail.Metadata.Label title="" text="No recent transactions" />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="Open bunq" target="https://bunq.com/app" text="Open in bunq app" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

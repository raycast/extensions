import { ActionPanel, Detail } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useCredit } from "./lib/hooks/useCredit";
import { formatCurrency } from "./lib/utils";

export default function ViewCredit() {
  return (
    <FeatureGuard feature="credit">
      {(apiKey, accountName) => (
        <CreditDetail apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function CreditDetail({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: credit, isLoading, error } = useCredit(apiKey);

  const markdown = error
    ? `# Credit Account\n\nNo credit account available or not enabled for this account.`
    : credit
      ? `# Credit Account

**Credit Limit:** ${formatCurrency(credit.creditLimit)}
**Current Balance:** ${formatCurrency(credit.currentBalance)}
**Available Credit:** ${formatCurrency(credit.availableCredit)}
**APR:** ${credit.apr}%
${credit.dueDate ? `**Due Date:** ${credit.dueDate}` : ""}
${credit.minimumPayment != null ? `**Minimum Payment:** ${formatCurrency(credit.minimumPayment)}` : ""}`
      : "Loading...";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      markdown={markdown}
      metadata={
        credit ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Credit Limit"
              text={formatCurrency(credit.creditLimit)}
            />
            <Detail.Metadata.Label
              title="Current Balance"
              text={formatCurrency(credit.currentBalance)}
            />
            <Detail.Metadata.Label
              title="Available Credit"
              text={formatCurrency(credit.availableCredit)}
            />
            <Detail.Metadata.Label title="APR" text={`${credit.apr}%`} />
            <Detail.Metadata.Label title="Status" text={credit.status} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <AccountSwitcherActions />
        </ActionPanel>
      }
    />
  );
}
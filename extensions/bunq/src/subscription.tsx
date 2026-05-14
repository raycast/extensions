/**
 * Subscription command for viewing bunq billing contract and subscription info.
 */

import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getBillingContractSubscription, BillingContractSubscription } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { ErrorView } from "./components";
import { formatDate } from "./lib/formatters";
import { getErrorMessage } from "./lib/errors";
import { getBillingContractStatusAppearance } from "./lib/status-helpers";
import InvoicesCommand from "./invoices";

// ============== Helpers ==============

function getSubscriptionTypeName(type: string | undefined): string {
  if (!type) return "Unknown";

  // Format subscription type for display
  const typeMap: Record<string, string> = {
    BUNQ_PREMIUM: "bunq Premium",
    BUNQ_PREMIUM_SUPER_HUMAN: "bunq Premium SuperHuman",
    BUNQ_JOINT: "bunq Joint",
    BUNQ_TRAVEL: "bunq Travel",
    BUNQ_BUSINESS: "bunq Business",
    BUNQ_EASY_BANK: "bunq easyBank",
    BUNQ_EASY_MONEY: "bunq easyMoney",
    BUNQ_EASY_GREEN: "bunq easyGreen",
    BUNQ_PERSONAL: "bunq Personal",
    BUNQ_FREE: "bunq Free",
  };

  return typeMap[type] || type.replace(/_/g, " ");
}

function getContractMarkdown(contract: BillingContractSubscription): string {
  const subscriptionType = getSubscriptionTypeName(contract.subscription_type);
  const downgradeType = contract.subscription_type_downgrade
    ? getSubscriptionTypeName(contract.subscription_type_downgrade)
    : null;

  let markdown = `# ${subscriptionType}

---

## Contract Details

`;

  if (contract.contract_date_start) {
    markdown += `- **Start Date:** ${formatDate(contract.contract_date_start)}\n`;
  }

  if (contract.contract_date_end) {
    markdown += `- **End Date:** ${formatDate(contract.contract_date_end)}\n`;
  }

  if (contract.contract_version) {
    markdown += `- **Contract Version:** ${contract.contract_version}\n`;
  }

  if (contract.status) {
    markdown += `- **Status:** ${contract.status}\n`;
  }

  if (downgradeType) {
    markdown += `\n---\n\n**Scheduled Downgrade:** ${downgradeType}\n`;
  }

  markdown += `
---

*To change your subscription plan, please use the bunq app.*
`;

  return markdown;
}

// ============== Main Component ==============

export default function SubscriptionCommand() {
  const session = useBunqSession();
  const { push } = useNavigation();

  const {
    data: contracts,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (): Promise<BillingContractSubscription[]> => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () =>
        getBillingContractSubscription(session.userId!, session.getRequestOptions()),
      );
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  if (session.isLoading || isLoading) {
    return <Detail isLoading markdown="Loading subscription..." />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Subscription"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  // Get the most recent active contract
  const activeContract = contracts?.find((c) => c.status === "ACTIVE") || contracts?.[0];

  if (!activeContract) {
    return (
      <Detail
        markdown="# No Subscription Found\n\nUnable to load your bunq subscription information. Please check your account in the bunq app."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Bunq App" icon={Icon.Globe} url="https://bunq.com/app" />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  const statusAppearance = getBillingContractStatusAppearance(activeContract.status || "UNKNOWN");
  const subscriptionType = getSubscriptionTypeName(activeContract.subscription_type);

  return (
    <Detail
      navigationTitle={subscriptionType}
      markdown={getContractMarkdown(activeContract)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Plan" text={subscriptionType} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={statusAppearance.label} color={statusAppearance.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {activeContract.contract_date_start && (
            <Detail.Metadata.Label title="Start Date" text={formatDate(activeContract.contract_date_start)} />
          )}
          {activeContract.contract_date_end && (
            <Detail.Metadata.Label title="End Date" text={formatDate(activeContract.contract_date_end)} />
          )}
          {activeContract.contract_version && (
            <Detail.Metadata.Label title="Version" text={activeContract.contract_version.toString()} />
          )}
          {activeContract.subscription_type_downgrade && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Downgrade To"
                text={getSubscriptionTypeName(activeContract.subscription_type_downgrade)}
              />
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="bunq Plans" target="https://www.bunq.com/plans" text="View all plans" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="View Invoices" icon={Icon.Receipt} onAction={() => push(<InvoicesCommand />)} />
          <Action.OpenInBrowser title="Manage in Bunq App" icon={Icon.Globe} url="https://bunq.com/app" />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Reset Connection"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={session.reconnect}
          />
        </ActionPanel>
      }
    />
  );
}

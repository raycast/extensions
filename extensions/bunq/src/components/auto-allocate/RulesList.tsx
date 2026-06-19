/**
 * List component for displaying and managing auto-allocation rules.
 */

import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import {
  MonetaryAccount,
  getAutoAllocations,
  deleteAutoAllocation,
  type AutoAllocationRule,
} from "../../api/endpoints";
import { useBunqSession, withSessionRefresh } from "../../hooks/useBunqSession";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../lib/formatters";
import { getErrorMessage } from "../../lib/errors";
import { ErrorView } from "../ErrorView";
import { CreateRuleForm } from "./CreateRuleForm";
import { requireUserId } from "../../lib/session-guard";

export interface RulesListProps {
  sourceAccount: MonetaryAccount;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
}

export function RulesList({ sourceAccount, session, onUpdate }: RulesListProps) {
  const { accounts } = useAccounts(session);

  const {
    data: rules,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (accountId: number) => {
      if (!session.userId || !session.sessionToken) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getAutoAllocations(userId, accountId, session.getRequestOptions()));
    },
    [sourceAccount.id],
    { execute: session.isConfigured && !session.isLoading },
  );

  const handleDelete = useCallback(
    async (rule: AutoAllocationRule) => {
      const confirmed = await confirmAlert({
        title: "Delete Rule",
        message: "Are you sure you want to delete this auto-allocation rule?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting rule..." });

        const userId = requireUserId(session);
        await withSessionRefresh(session, () =>
          deleteAutoAllocation(userId, sourceAccount.id, rule.id, session.getRequestOptions()),
        );

        await showToast({ style: Toast.Style.Success, title: "Rule deleted" });
        revalidate();
        onUpdate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete rule",
          message: getErrorMessage(error),
        });
      }
    },
    [session, sourceAccount.id, revalidate, onUpdate],
  );

  const { push } = useNavigation();
  const targetAccounts = accounts?.filter((a) => a.status === "ACTIVE" && a.id !== sourceAccount.id) || [];

  if (error) {
    return (
      <ErrorView
        title="Error Loading Rules"
        message={getErrorMessage(error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const getTargetAccountName = (targetId: number): string => {
    const account = accounts?.find((a) => a.id === targetId);
    return account?.description || `Account ${targetId}`;
  };

  return (
    <List isLoading={isLoading} navigationTitle={`Rules - ${sourceAccount.description}`}>
      <List.Section title="Actions">
        <List.Item
          title="Add New Rule"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Add Rule"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <CreateRuleForm
                      sourceAccount={sourceAccount}
                      targetAccounts={targetAccounts}
                      session={session}
                      onCreated={() => {
                        revalidate();
                        onUpdate();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {rules && rules.length > 0 && (
        <List.Section title={`Active Rules (${rules.length})`}>
          {rules.map((rule) => {
            const isPercentage = rule.type === "PERCENTAGE";
            const allocation = isPercentage
              ? `${rule.percentage}%`
              : rule.amount
                ? formatCurrency(rule.amount.value, rule.amount.currency)
                : "Unknown";

            return (
              <List.Item
                key={rule.id}
                title={`${allocation} → ${getTargetAccountName(rule.target_account_id)}`}
                subtitle={isPercentage ? "of each payment" : "per payment"}
                icon={{ source: isPercentage ? Icon.Raindrop : Icon.Coins, tintColor: Color.Green }}
                accessories={[{ tag: { value: rule.type, color: Color.SecondaryText } }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Delete Rule"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(rule)}
                    />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {(!rules || rules.length === 0) && !isLoading && (
        <List.EmptyView
          icon={Icon.Shuffle}
          title="No Auto-Allocation Rules"
          description="Add a rule to automatically allocate incoming payments"
          actions={
            <ActionPanel>
              <Action
                title="Add Rule"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <CreateRuleForm
                      sourceAccount={sourceAccount}
                      targetAccounts={targetAccounts}
                      session={session}
                      onCreated={() => {
                        revalidate();
                        onUpdate();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

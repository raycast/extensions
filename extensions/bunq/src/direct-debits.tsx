/**
 * Direct Debits command for managing SEPA direct debit mandates.
 */

import { Action, ActionPanel, List, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import {
  getMonetaryAccounts,
  getWhitelistSdd,
  deleteWhitelistSdd,
  MonetaryAccount,
  WhitelistSdd,
} from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { ErrorView } from "./components";
import { formatCurrency } from "./lib/formatters";
import { getErrorMessage } from "./lib/errors";
import { copyToClipboard } from "./lib/actions";
import { getWhitelistSddStatusAppearance } from "./lib/status-helpers";
import { requireUserId } from "./lib/session-guard";

// ============== Helpers ==============

function getMandateStatus(whitelist: WhitelistSdd): string {
  return whitelist.status?.toUpperCase() || "UNKNOWN";
}

function getCreditorName(whitelist: WhitelistSdd): string {
  return (
    whitelist.counterparty_alias?.display_name ||
    whitelist.counterparty_alias?.name ||
    whitelist.counterparty_alias?.iban ||
    whitelist.credit_scheme_identifier ||
    "Unknown Creditor"
  );
}

function getCreditorIban(whitelist: WhitelistSdd): string {
  return whitelist.counterparty_alias?.iban || "";
}

// ============== Main Component ==============

export default function DirectDebitsCommand() {
  const session = useBunqSession();

  // Fetch accounts
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = usePromise(
    async (): Promise<MonetaryAccount[]> => {
      if (!session.userId || !session.sessionToken) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getMonetaryAccounts(userId, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const activeAccounts = useMemo(() => accounts?.filter((a) => a.status === "ACTIVE") || [], [accounts]);

  // Fetch all direct debits for all accounts
  const {
    data: allWhitelists,
    isLoading: whitelistsLoading,
    error: whitelistsError,
    revalidate,
  } = usePromise(
    async (): Promise<{ account: MonetaryAccount; whitelists: WhitelistSdd[] }[]> => {
      if (!session.userId || !session.sessionToken || activeAccounts.length === 0) return [];

      const userId = requireUserId(session);
      const results: { account: MonetaryAccount; whitelists: WhitelistSdd[] }[] = [];

      for (const account of activeAccounts) {
        try {
          const whitelists = await withSessionRefresh(session, () =>
            getWhitelistSdd(userId, account.id, session.getRequestOptions()),
          );
          if (whitelists.length > 0) {
            results.push({ account, whitelists });
          }
        } catch {
          // Skip accounts that fail
        }
      }

      return results;
    },
    [],
    { execute: session.isConfigured && !session.isLoading && activeAccounts.length > 0 },
  );

  const handleDelete = useCallback(
    async (account: MonetaryAccount, whitelist: WhitelistSdd) => {
      const confirmed = await confirmAlert({
        title: "Revoke Direct Debit Mandate",
        message: `Are you sure you want to revoke the direct debit mandate for ${getCreditorName(whitelist)}?\n\nThis will prevent future direct debits from this creditor.`,
        primaryAction: {
          title: "Revoke",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await showToast({ style: Toast.Style.Animated, title: "Revoking mandate..." });

        const userId = requireUserId(session);
        await withSessionRefresh(session, () =>
          deleteWhitelistSdd(userId, account.id, whitelist.id, session.getRequestOptions()),
        );

        await showToast({ style: Toast.Style.Success, title: "Mandate revoked" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to revoke mandate",
          message: getErrorMessage(error),
        });
      }
    },
    [session, revalidate],
  );

  const isLoading = session.isLoading || accountsLoading || whitelistsLoading;

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || accountsError || whitelistsError) {
    return (
      <ErrorView
        title="Error Loading Direct Debits"
        message={getErrorMessage(session.error || accountsError || whitelistsError)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Direct Debits">
      {allWhitelists && allWhitelists.length > 0 ? (
        allWhitelists.map(({ account, whitelists }) => (
          <List.Section
            key={account.id}
            title={account.description}
            subtitle={`${whitelists.length} mandate${whitelists.length !== 1 ? "s" : ""}`}
          >
            {whitelists.map((whitelist: WhitelistSdd) => {
              const status = getMandateStatus(whitelist);
              const statusAppearance = getWhitelistSddStatusAppearance(status);
              const creditorName = getCreditorName(whitelist);
              const creditorIban = getCreditorIban(whitelist);
              const maxAmount = whitelist.maximum_amount_per_payment
                ? formatCurrency(
                    whitelist.maximum_amount_per_payment.value,
                    whitelist.maximum_amount_per_payment.currency,
                  )
                : null;

              return (
                <List.Item
                  key={whitelist.id}
                  title={creditorName}
                  subtitle={whitelist.mandate_identifier || creditorIban}
                  icon={{ source: Icon.Repeat, tintColor: statusAppearance.color }}
                  accessories={[
                    ...(maxAmount ? [{ text: `Max: ${maxAmount}`, tooltip: "Maximum per payment" }] : []),
                    { tag: { value: statusAppearance.label, color: statusAppearance.color } },
                    ...(whitelist.created ? [{ date: new Date(whitelist.created), tooltip: "Created" }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      {creditorIban && (
                        <Action
                          title="Copy Creditor IBAN"
                          icon={Icon.Clipboard}
                          onAction={() => copyToClipboard(creditorIban, "creditor IBAN")}
                        />
                      )}
                      {whitelist.mandate_identifier && (
                        <Action
                          title="Copy Mandate Reference"
                          icon={Icon.Clipboard}
                          onAction={() => copyToClipboard(whitelist.mandate_identifier!, "mandate reference")}
                        />
                      )}
                      <Action
                        title="Revoke Mandate"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={() => handleDelete(account, whitelist)}
                      />
                      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Repeat}
          title="No Direct Debit Mandates"
          description="Direct debit mandates (SEPA SDD) allow companies to automatically collect payments from your account. You can set these up through your bunq app when authorizing recurring payments."
        />
      )}
    </List>
  );
}

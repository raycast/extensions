import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getAllAccounts } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { CACHE_KEYS, getCached, setCached, removeCached } from "../lib/cache";
import { CACHE_TTL } from "../lib/constants";
import { Account, CredentialWithAccounts } from "../lib/types";
import { formatCurrency } from "../lib/format";
import { LogoutAction } from "./logout-action";
import { TransactionsList } from "./TransactionsList";

const ACCOUNT_TYPE_ICONS: Record<string, Icon> = {
  bank: Icon.Building,
  credit_card: Icon.CreditCard,
  point: Icon.Star,
  stored_value: Icon.Wallet,
  stock: Icon.LineChart,
  manual: Icon.BankNote,
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Banks",
  credit_card: "Credit Cards",
  stock: "Investments",
  stored_value: "Digital Money",
  point: "Points",
  manual: "Others",
  cash_wallet: "Others",
};

function formatAccountType(accountType: string): string {
  return ACCOUNT_TYPE_LABELS[accountType] || accountType;
}

function getCredentialName(credential: CredentialWithAccounts): string {
  if (credential.status === "manual") return "Cash Tracking";
  return credential.institution_name || `Credential #${credential.id}`;
}

function getAccountDetails(account: Account): string {
  return `${account.nickname || account.institution_account_name}: ${formatCurrency(account.current_balance, account.currency)}`;
}

const UNSUPPORTED_ACCOUNT_TYPES = ["manual", "cash_wallet"];

export function AccountsList({ credentialId }: { credentialId?: string }) {
  const [credentials, setCredentials] = useState<CredentialWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentialFilter, setCredentialFilter] = useState(credentialId || "");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    async function fetchAccounts() {
      try {
        setIsLoading(true);
        setError(null);

        const cached = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
        if (cached && cached.length > 0) {
          setCredentials(cached);
          setIsLoading(false);
          try {
            await getAccessToken();
            const data = await getAllAccounts();
            setCredentials(data);
            setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
          } catch (refreshError) {
            if (
              refreshError instanceof Error &&
              (refreshError.message.includes("authentication") || refreshError.message.includes("preferences"))
            ) {
              removeCached(CACHE_KEYS.dataSnapshot());
              setCredentials([]);
              setError(refreshError.message);
              await showToast({
                style: Toast.Style.Failure,
                title: "Authentication required",
                message: "Please check your credentials in extension preferences",
              });
            }
          }
          return;
        }

        await getAccessToken();
        const data = await getAllAccounts();
        setCredentials(data);
        setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch accounts";
        setError(errorMessage);
        await showToast({ style: Toast.Style.Failure, title: "Error", message: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  if (error && credentials.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Accounts" description={error} />
      </List>
    );
  }

  const filteredCredentials = credentialFilter
    ? credentials.filter((c) => String(c.id) === credentialFilter)
    : credentials;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Accounts"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Credential"
          storeValue={!credentialId}
          defaultValue={credentialId || ""}
          onChange={(v) => {
            if (credentialId && v === "" && credentials.length === 0) return;
            setCredentialFilter(v);
          }}
        >
          <List.Dropdown.Item title="All" value="" />
          {credentials
            .filter((cred) => cred.accounts.some((acc) => !UNSUPPORTED_ACCOUNT_TYPES.includes(acc.account_type)))
            .sort((a, b) => getCredentialName(a).localeCompare(getCredentialName(b)))
            .map((cred) => (
              <List.Dropdown.Item key={cred.id} title={getCredentialName(cred)} value={String(cred.id)} />
            ))}
        </List.Dropdown>
      }
    >
      {filteredCredentials.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Wallet}
          title="No Accounts"
          description="No accounts found."
          actions={
            <ActionPanel>
              <LogoutAction />
            </ActionPanel>
          }
        />
      ) : (
        filteredCredentials
          .filter((cred) => cred.accounts.some((acc) => !UNSUPPORTED_ACCOUNT_TYPES.includes(acc.account_type)))
          .sort((a, b) => getCredentialName(a).localeCompare(getCredentialName(b)))
          .map((credential) => (
            <List.Section key={credential.id} title={getCredentialName(credential)}>
              {credential.accounts
                .filter((acc) => !UNSUPPORTED_ACCOUNT_TYPES.includes(acc.account_type))
                .sort((a, b) =>
                  (a.nickname || a.institution_account_name).localeCompare(b.nickname || b.institution_account_name),
                )
                .map((account) => (
                  <List.Item
                    key={account.id}
                    icon={ACCOUNT_TYPE_ICONS[account.account_type] || Icon.Wallet}
                    title={account.nickname || account.institution_account_name}
                    subtitle={formatAccountType(account.account_type)}
                    accessories={[{ text: formatCurrency(account.current_balance, account.currency) }]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Transactions"
                          icon={Icon.Receipt}
                          target={<TransactionsList accountId={String(account.id)} />}
                        />
                        <Action.CopyToClipboard
                          title="Copy Account Details"
                          icon={Icon.Clipboard}
                          content={getAccountDetails(account)}
                        />
                        <LogoutAction />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          ))
      )}
    </List>
  );
}

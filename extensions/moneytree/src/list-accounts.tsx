import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getAllAccounts } from "./lib/api";
import { getAccessToken } from "./lib/auth";
import { CACHE_KEYS, getCached, setCached, removeCached } from "./lib/cache";
import { CACHE_TTL } from "./lib/constants";
import { Account, CredentialWithAccounts } from "./lib/types";

function getAccountTypeIcon(accountType: string): Icon {
  switch (accountType) {
    case "bank":
      return Icon.Building;
    case "credit_card":
      return Icon.CreditCard;
    case "point":
      return Icon.Star;
    case "stored_value":
      return Icon.Wallet;
    case "stock":
      return Icon.LineChart;
    case "manual":
      return Icon.BankNote;
    default:
      return Icon.Wallet;
  }
}

function formatCurrency(amount: number, currency: string = "JPY"): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAccountType(accountType: string): string {
  return accountType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Command() {
  const [credentials, setCredentials] = useState<CredentialWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function fetchAccounts() {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first - if we have valid cached data, use it immediately
        console.debug("[List Accounts] Checking cache...");
        const cached = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
        if (cached && cached.length > 0) {
          const accountCount = cached.reduce((sum, cred) => sum + cred.accounts.length, 0);
          console.debug(`[List Accounts] Using cached data (${cached.length} credentials, ${accountCount} accounts)`);
          setCredentials(cached);
          setIsLoading(false);
          // Fetch fresh data in the background (silently update cache)
          console.debug("[List Accounts] Background refresh started");
          try {
            await getAccessToken();
            const data = await getAllAccounts();
            const newAccountCount = data.reduce((sum, cred) => sum + cred.accounts.length, 0);
            console.debug(
              `[List Accounts] Background refresh complete (${data.length} credentials, ${newAccountCount} accounts)`,
            );
            setCredentials(data);
            setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
          } catch (error) {
            console.debug(`[List Accounts] Background refresh failed: ${error}`);
            // If authentication fails, clear cache and show error
            if (error instanceof Error && error.message.includes("Authenticate")) {
              removeCached(CACHE_KEYS.dataSnapshot());
              setCredentials([]);
              setError(error.message);
              await showToast({
                style: Toast.Style.Failure,
                title: "Authentication required",
                message: "Please authenticate to view accounts",
              });
              return;
            }
            // Silently fail background refresh - we have cached data to show
          }
          return;
        }

        // No cache or cache expired - fetch fresh data
        console.debug("[List Accounts] Cache miss - fetching fresh data");
        await getAccessToken();
        const data = await getAllAccounts();
        setCredentials(data);
        setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch accounts";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  // Flatten accounts from credentials
  const allAccounts: (Account & { institutionName: string; credentialId: number })[] = credentials.flatMap(
    (credential) =>
      credential.accounts.map((account) => ({
        ...account,
        institutionName: credential.institution_name || "Unknown Institution",
        credentialId: credential.id,
      })),
  );

  if (error && allAccounts.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Accounts" description={error} />
      </List>
    );
  }

  const unsupportedAccountTypes = ["manual", "cash_wallet"];

  return (
    <List isLoading={isLoading}>
      {allAccounts.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Wallet} title="No Accounts" description="No accounts found." />
      ) : (
        allAccounts
          .filter((account) => !unsupportedAccountTypes.includes(account.account_type))
          .sort((a, b) => a.nickname.localeCompare(b.nickname))
          .map((account) => (
            <List.Item
              key={account.id}
              icon={{ source: getAccountTypeIcon(account.account_type), tintColor: Color.Blue }}
              title={account.nickname || account.institution_account_name}
              subtitle={`${formatAccountType(account.account_type)} • ${account.institutionName}`}
              accessories={[
                {
                  text: formatCurrency(account.current_balance, account.currency),
                  icon: account.current_balance >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Account Name" text={account.nickname} />
                      <List.Item.Detail.Metadata.Label
                        title="Institution Account Number"
                        text={account.institution_account_number || "N/A"}
                      />
                      <List.Item.Detail.Metadata.Label title="Institution" text={account.institutionName} />
                      <List.Item.Detail.Metadata.Label
                        title="Account Type"
                        text={formatAccountType(account.account_type)}
                      />
                      <List.Item.Detail.Metadata.Label title="Sub Type" text={account.sub_type} />
                      <List.Item.Detail.Metadata.Label title="Status" text={account.status} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Current Balance"
                        text={formatCurrency(account.current_balance, account.currency)}
                      />
                      {account.branch_name && (
                        <List.Item.Detail.Metadata.Label title="Branch" text={account.branch_name} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))
      )}
    </List>
  );
}

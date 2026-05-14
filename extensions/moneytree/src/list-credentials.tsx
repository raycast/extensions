import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getCredentials } from "./lib/api";
import { getAccessToken } from "./lib/auth";
import { CACHE_KEYS, getCached, setCached, removeCached } from "./lib/cache";
import { CACHE_TTL } from "./lib/constants";
import { CredentialWithAccounts } from "./lib/types";
import { AccountsList } from "./components/AccountsList";
import { LogoutAction } from "./components/logout-action";
import { formatCurrency } from "./lib/format";

const GROUP_ORDER = ["bank", "credit_card", "investment", "stored_value", "point", "other"] as const;

const GROUP_LABELS: Record<string, string> = {
  bank: "Banks",
  credit_card: "Credit Cards",
  investment: "Investments",
  stored_value: "Digital Money",
  point: "Points",
  other: "Others",
};

const GROUP_ICONS: Record<string, Icon> = {
  bank: Icon.Building,
  credit_card: Icon.CreditCard,
  investment: Icon.LineChart,
  stored_value: Icon.Wallet,
  point: Icon.Star,
  other: Icon.Dot,
};

function getCredentialName(credential: CredentialWithAccounts): string {
  if (credential.status === "manual") return "Cash Tracking";
  return credential.institution_name || `Credential #${credential.id}`;
}

function getCredentialTotalBalance(credential: CredentialWithAccounts): number {
  return credential.accounts.reduce((sum, acc) => sum + acc.current_balance_in_base, 0);
}

/** Determine the primary group for a credential based on its accounts */
function getPrimaryGroup(credential: CredentialWithAccounts): string {
  if (credential.status === "manual") return "other";
  const groups = new Set(credential.accounts.map((a) => a.group).filter(Boolean));
  // Prefer non-point groups as primary
  for (const g of GROUP_ORDER) {
    if (g !== "point" && g !== "other" && groups.has(g)) return g;
  }
  if (groups.has("point")) return "point";
  return "other";
}

function groupCredentials(credentials: CredentialWithAccounts[]): [string, CredentialWithAccounts[]][] {
  const grouped = new Map<string, CredentialWithAccounts[]>();
  for (const cred of credentials) {
    const group = getPrimaryGroup(cred);
    const list = grouped.get(group);
    if (list) {
      list.push(cred);
    } else {
      grouped.set(group, [cred]);
    }
  }
  // Return in display order
  return GROUP_ORDER.filter((g) => grouped.has(g)).map((g) => [g, grouped.get(g)!]);
}

function TypeDropdown(props: { onTypeChange: (type: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter by Type" storeValue onChange={props.onTypeChange}>
      <List.Dropdown.Item title="All" value="" />
      {GROUP_ORDER.map((g) => (
        <List.Dropdown.Item key={g} title={GROUP_LABELS[g]} value={g} icon={GROUP_ICONS[g]} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [credentials, setCredentials] = useState<CredentialWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    async function fetchCredentials() {
      try {
        setIsLoading(true);
        setError(null);

        const cached = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
        if (cached && cached.length > 0) {
          setCredentials(cached);
          setIsLoading(false);
          try {
            await getAccessToken();
            const data = await getCredentials();
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
        const data = await getCredentials();
        setCredentials(data);
        setCached(CACHE_KEYS.dataSnapshot(), data, CACHE_TTL.ACCOUNTS);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch credentials";
        setError(errorMessage);
        await showToast({ style: Toast.Style.Failure, title: "Error", message: errorMessage });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCredentials();
  }, []);

  if (error && credentials.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Credentials" description={error} />
      </List>
    );
  }

  const grouped = groupCredentials(credentials).filter(([group]) => !typeFilter || group === typeFilter);

  return (
    <List isLoading={isLoading} searchBarAccessory={<TypeDropdown onTypeChange={setTypeFilter} />}>
      {credentials.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Credentials"
          description="No credentials found."
          actions={
            <ActionPanel>
              <LogoutAction />
            </ActionPanel>
          }
        />
      ) : (
        grouped.map(([group, creds]) => (
          <List.Section key={group} title={GROUP_LABELS[group] || group}>
            {creds
              .sort((a, b) => getCredentialName(a).localeCompare(getCredentialName(b)))
              .map((credential) => {
                const balance = getCredentialTotalBalance(credential);
                return (
                  <List.Item
                    key={credential.id}
                    icon={GROUP_ICONS[group] || Icon.Dot}
                    title={getCredentialName(credential)}
                    accessories={[{ text: formatCurrency(balance) }]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Accounts"
                          icon={Icon.Wallet}
                          target={<AccountsList credentialId={String(credential.id)} />}
                        />
                        <Action.CopyToClipboard
                          title="Copy Credential Details"
                          icon={Icon.Clipboard}
                          content={`${getCredentialName(credential)}: ${formatCurrency(balance)}`}
                        />
                        <LogoutAction />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        ))
      )}
    </List>
  );
}

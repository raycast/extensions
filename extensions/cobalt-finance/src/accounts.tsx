import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Image,
  List,
} from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

import { pickInstitutionIcon } from "./icons";
import { authorize, logout } from "./oauth";

interface AccountItem {
  plaidAccountId: string | null;
  plaidItemId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  currency: string | null;
  current: number | null;
  creditLimit: number | null;
  updatedAt: string | null;
  institutionName: string | null;
  newAccountsAvailable: boolean | null;
  logo: string | null;
  canAddInvestments: boolean;
  hasInvestments: boolean;
  hasLiabilities: boolean;
  needsReauth: boolean;
  pendingDisconnectAt: string | null;
  userOverrideCreditLimit: number | null;
}

interface AccountsResponse {
  accounts: AccountItem[];
}

const dateDisplay = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

function currencyFor(code: string | null): Intl.NumberFormat {
  return new Intl.NumberFormat("en-US", {
    currency: (code ?? "USD").toUpperCase(),
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  });
}

function formatBalance(amount: number | null, code: string | null): string {
  if (amount === null) {
    return "—";
  }
  return currencyFor(code).format(amount);
}

function formatUpdated(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? iso : dateDisplay.format(new Date(t));
}

function isCreditAccount(a: AccountItem): boolean {
  return a.type === "credit";
}

function accountTypeLabel(a: AccountItem): string {
  if (a.subtype) {
    return a.subtype
      .replaceAll("_", " ")
      .replaceAll(/\b\w/g, (c) => c.toUpperCase());
  }
  return a.type.replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

function utilization(a: AccountItem): number | null {
  if (!isCreditAccount(a)) {
    return null;
  }
  const limit = a.userOverrideCreditLimit ?? a.creditLimit;
  if (!limit || a.current === null) {
    return null;
  }
  return Math.min(100, Math.max(0, (Math.abs(a.current) / limit) * 100));
}

function buildLimitLine(
  isCredit: boolean,
  limitStr: string | null,
  util: number | null,
): string {
  if (!(isCredit && limitStr)) {
    return "";
  }
  const usedSuffix = util === null ? "" : ` · ${util.toFixed(0)}% used`;
  return `\n**Limit:** ${limitStr}${usedSuffix}\n`;
}

function AccountDetail({
  account,
  brandfetchClientId,
}: {
  account: AccountItem;
  brandfetchClientId: string | undefined;
}) {
  const a = account;
  const balance = formatBalance(a.current, a.currency);
  const limit = a.userOverrideCreditLimit ?? a.creditLimit;
  const limitStr = limit === null ? null : formatBalance(limit, a.currency);
  const util = utilization(a);
  const institutionIcon = pickInstitutionIcon({
    accountName: a.name,
    brandfetchClientId,
    institutionLogo: a.logo,
    institutionName: a.institutionName,
    institutionUrl: null,
  });

  const logoMd =
    typeof institutionIcon === "string" && /^https?:\/\//.test(institutionIcon)
      ? `![logo](${institutionIcon})\n\n`
      : "";

  const markdown = [
    logoMd,
    `# ${a.name}\n`,
    `## ${balance}\n`,
    buildLimitLine(isCreditAccount(a), limitStr, util),
  ].join("");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={a.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            {a.needsReauth ? (
              <Detail.Metadata.TagList.Item
                text="Needs Reauth"
                color={Color.Red}
              />
            ) : (
              <Detail.Metadata.TagList.Item
                text="Connected"
                color={Color.Green}
              />
            )}
            {a.pendingDisconnectAt ? (
              <Detail.Metadata.TagList.Item
                text="Pending Disconnect"
                color={Color.Orange}
              />
            ) : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Balance" text={balance} />
          {isCreditAccount(a) && limitStr ? (
            <Detail.Metadata.Label title="Credit Limit" text={limitStr} />
          ) : null}
          {util === null ? null : (
            <Detail.Metadata.Label
              title="Utilization"
              text={`${util.toFixed(0)}%`}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Type" text={accountTypeLabel(a)} />
          {a.mask ? (
            <Detail.Metadata.Label title="Account" text={`••••${a.mask}`} />
          ) : null}
          <Detail.Metadata.Label
            title="Currency"
            text={(a.currency ?? "USD").toUpperCase()}
          />
          <Detail.Metadata.Separator />
          {a.institutionName ? (
            <Detail.Metadata.Label
              title="Institution"
              icon={
                institutionIcon
                  ? { mask: Image.Mask.Circle, source: institutionIcon }
                  : undefined
              }
              text={a.institutionName}
            />
          ) : null}
          <Detail.Metadata.Label
            title="Last updated"
            text={formatUpdated(a.updatedAt)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Balance" content={balance} />
          {a.mask ? (
            <Action.CopyToClipboard title="Copy Mask" content={a.mask} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { apiUrl, brandfetchClientId } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const token = await authorize(base);
        setAccessToken(token);
      } catch (error) {
        showFailureToast(error, { title: "Sign-in failed" });
      }
    };
    void run();
  }, [base]);

  const { isLoading, data, revalidate, error } = useFetch(
    `${base}/v1/accounts`,
    {
      execute: !!accessToken,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      initialData: [] as AccountItem[],
      keepPreviousData: true,
      mapResult(result: AccountsResponse) {
        return { data: result.accounts };
      },
    },
  );

  const signOutAction = (
    <Action
      title="Sign out"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
      onAction={async () => {
        await logout();
        setAccessToken(null);
      }}
    />
  );

  const accounts = data ?? [];

  const grouped: Record<string, AccountItem[]> = {};
  for (const a of accounts) {
    const key = a.institutionName ?? "Other";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(a);
  }
  const sectionNames = Object.keys(grouped).toSorted();

  return (
    <List
      isLoading={isLoading || !accessToken}
      searchBarPlaceholder="Search accounts"
      actions={<ActionPanel>{signOutAction}</ActionPanel>}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load accounts"
          description={error.message}
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
      {sectionNames.map((sectionName) => {
        const sectionAccounts = grouped[sectionName] ?? [];

        return (
          <List.Section
            key={sectionName}
            title={sectionName}
            subtitle={`${sectionAccounts.length} account${sectionAccounts.length === 1 ? "" : "s"}`}
          >
            {sectionAccounts.map((a) => {
              const balance = formatBalance(a.current, a.currency);
              const institutionIcon = pickInstitutionIcon({
                accountName: a.name,
                brandfetchClientId,
                institutionLogo: a.logo,
                institutionName: a.institutionName,
                institutionUrl: null,
              });
              const util = utilization(a);

              const accessories: List.Item.Accessory[] = [];
              if (util !== null) {
                let utilColor: Color = Color.Green;
                if (util >= 70) {
                  utilColor = Color.Red;
                } else if (util >= 30) {
                  utilColor = Color.Orange;
                }
                accessories.push({
                  tag: { color: utilColor, value: `${util.toFixed(0)}%` },
                  tooltip: "Credit utilization",
                });
              }
              accessories.push({
                text: accountTypeLabel(a),
                tooltip: "Account type",
              });
              if (a.mask) {
                accessories.push({
                  text: `••${a.mask}`,
                  tooltip: "Mask",
                });
              }
              if (a.needsReauth) {
                accessories.push({
                  icon: { source: Icon.Warning, tintColor: Color.Red },
                  tooltip: "Needs reauth",
                });
              }

              return (
                <List.Item
                  key={a.plaidAccountId ?? `${a.plaidItemId}-${a.name}`}
                  icon={
                    institutionIcon
                      ? {
                          mask: Image.Mask.Circle,
                          source: institutionIcon,
                        }
                      : Icon.BankNote
                  }
                  title={a.name}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Show Details"
                        icon={Icon.Sidebar}
                        target={
                          <AccountDetail
                            account={a}
                            brandfetchClientId={brandfetchClientId}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Balance"
                        content={balance}
                      />
                      {a.mask ? (
                        <Action.CopyToClipboard
                          title="Copy Mask"
                          content={a.mask}
                        />
                      ) : null}
                      <Action
                        title="Reload"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ key: "r", modifiers: ["cmd"] }}
                        onAction={revalidate}
                      />
                      {signOutAction}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
      {!isLoading && !error && accessToken && accounts.length === 0 ? (
        <List.EmptyView
          icon={Icon.BankNote}
          title="No connected accounts"
          description="Connect a bank in Cobalt to see balances here"
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}

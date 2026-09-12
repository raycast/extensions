import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { MissingTokenView } from "./components/MissingTokenView";
import { showStarlingErrorToast } from "./lib/errors";
import { getResolvedPreferences } from "./lib/preferences";
import { getPayees } from "./lib/starling";
import { StarlingPayee, StarlingPayeeAccount } from "./lib/types";

function getPayeeDisplayName(payee: StarlingPayee): string {
  if (payee.payeeName) return payee.payeeName;
  if (payee.name) return payee.name;
  if (payee.businessName) return payee.businessName;

  const fullName = [payee.firstName, payee.middleName, payee.lastName].filter(Boolean).join(" ").trim();
  return fullName || "Payee";
}

function getPayeeTypeLabel(payeeType?: string): string | undefined {
  if (!payeeType) return undefined;
  if (payeeType === "INDIVIDUAL") return "Individual";
  if (payeeType === "BUSINESS") return "Business";
  return payeeType;
}

function getAccountIdentifier(account: StarlingPayeeAccount): string | undefined {
  if (typeof account.accountIdentifier === "string") {
    return account.accountIdentifier || undefined;
  }

  return account.accountIdentifier?.iban || account.accountIdentifier?.accountNumber || undefined;
}

function getSortCode(account: StarlingPayeeAccount): string | undefined {
  if (typeof account.bankIdentifier === "string") {
    return account.bankIdentifier || undefined;
  }

  return account.bankIdentifier?.sortCode || undefined;
}

function getAccountLabel(account: StarlingPayeeAccount): string | undefined {
  return account.description || account.name || undefined;
}

function getRecentReferences(payee: StarlingPayee): string[] {
  const references = payee.accounts?.flatMap((account) => account.lastReferences ?? []) ?? [];
  const cleaned = references.map((reference) => reference.trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

function payeeMarkdown(payee: StarlingPayee): string {
  const lines: string[] = [`# ${getPayeeDisplayName(payee)}`, ""];
  const payeeTypeLabel = getPayeeTypeLabel(payee.payeeType);

  const identityLines = [
    payeeTypeLabel ? `- Type: ${payeeTypeLabel}` : undefined,
    payee.phoneNumber ? `- Phone: ${payee.phoneNumber}` : undefined,
    payee.dateOfBirth ? `- Date of Birth: ${payee.dateOfBirth}` : undefined,
  ].filter((line): line is string => Boolean(line));

  if (identityLines.length > 0) {
    lines.push("## Information", "", ...identityLines, "");
  }

  lines.push("## Linked Accounts", "");

  if (!payee.accounts || payee.accounts.length === 0) {
    lines.push("No linked accounts.");
    return lines.join("\n");
  }

  for (const [index, account] of payee.accounts.entries()) {
    const accountIdentifier = getAccountIdentifier(account);
    const sortCode = getSortCode(account);
    const accountLabel = getAccountLabel(account);

    lines.push(`### Account ${index + 1}`);

    const accountLines = [
      accountLabel ? `- Label: ${accountLabel}` : undefined,
      accountIdentifier ? `- Account Number: ${accountIdentifier}` : undefined,
      account.countryCode ? `- Country: ${account.countryCode}` : undefined,
      sortCode ? `- Sort Code: ${sortCode}` : undefined,
      account.defaultAccount ? "- Primary Account" : undefined,
    ].filter((line): line is string => Boolean(line));

    if (accountLines.length > 0) {
      lines.push(...accountLines);
    } else {
      lines.push("- Details unavailable");
    }

    lines.push("");
  }

  return lines.join("\n");
}

function PayeeDetail(props: { payee: StarlingPayee; onReload: () => void }) {
  const { payee, onReload } = props;
  const accountCount = payee.accounts?.length ?? 0;
  const payeeTypeLabel = getPayeeTypeLabel(payee.payeeType);
  const recentReferences = getRecentReferences(payee);

  return (
    <Detail
      navigationTitle={getPayeeDisplayName(payee)}
      markdown={payeeMarkdown(payee)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Linked Accounts" text={String(accountCount)} />
          {payeeTypeLabel ? <Detail.Metadata.Label title="Type" text={payeeTypeLabel} /> : null}
          {payee.phoneNumber ? <Detail.Metadata.Label title="Phone" text={payee.phoneNumber} /> : null}
          {recentReferences.length > 0 ? <Detail.Metadata.Separator /> : null}
          {recentReferences.length > 0 ? (
            <Detail.Metadata.TagList title="Recent References">
              {recentReferences.map((reference) => (
                <Detail.Metadata.TagList.Item key={reference} text={reference} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Reload Payees" icon={Icon.ArrowClockwise} onAction={onReload} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function PayeesCommand() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getPayees, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      void showStarlingErrorToast(error, "Failed to load payees");
    }
  }, [error]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search payees">
      <List.Section title="Payees" subtitle={String(data?.length ?? 0)}>
        {(data ?? []).map((payee) => {
          const firstAccountIdentifier = payee.accounts?.[0] ? getAccountIdentifier(payee.accounts[0]) : "";
          const displayName = getPayeeDisplayName(payee);
          const payeeTypeLabel = getPayeeTypeLabel(payee.payeeType);
          const firstAccountLabel = payee.accounts?.[0] ? getAccountLabel(payee.accounts[0]) : undefined;
          const displaySubtitle = firstAccountLabel || payeeTypeLabel || payee.phoneNumber || "Details available";

          return (
            <List.Item
              key={payee.payeeUid}
              icon={Icon.TwoPeople}
              title={displayName}
              subtitle={displaySubtitle}
              keywords={[
                displayName,
                payee.payeeName || "",
                payee.name || "",
                payeeTypeLabel || "",
                payee.firstName || "",
                payee.lastName || "",
                payee.phoneNumber || "",
                firstAccountIdentifier || "",
                ...(payee.accounts
                  ?.map((account) => getAccountIdentifier(account))
                  .filter((identifier): identifier is string => Boolean(identifier)) ?? []),
              ]}
              accessories={[
                ...(payeeTypeLabel ? [{ text: payeeTypeLabel }] : []),
                ...(firstAccountIdentifier ? [{ text: firstAccountIdentifier }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={<PayeeDetail payee={payee} onReload={revalidate} />}
                  />
                  <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!isLoading && (data?.length ?? 0) === 0 ? (
        <List.EmptyView title="No Payees" description="No saved payees are available." />
      ) : null}
    </List>
  );
}

export default function Command() {
  const preferences = getResolvedPreferences();

  if (!preferences.personalAccessToken && !preferences.useDemoData) {
    return <MissingTokenView />;
  }

  return <PayeesCommand />;
}

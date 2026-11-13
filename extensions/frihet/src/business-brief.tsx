import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BriefReviewItem,
  generateOperationalBusinessBrief,
  OperationalBusinessBrief,
  ReviewPriorityLevel,
} from "./lib/business-brief-engine.js";
import {
  buildFrihetDeepLink,
  formatAmountSource,
  formatProvenancedAmount,
  FrihetApiError,
} from "./lib/frihet-client.js";
import {
  clearActiveWorkspaceCache,
  createClientFromPreferences,
} from "./lib/runtime-client.js";

function priorityColor(level: ReviewPriorityLevel): Color {
  switch (level) {
    case "HIGH":
      return Color.Red;
    case "MEDIUM":
      return Color.Orange;
    case "LOW":
    default:
      return Color.Blue;
  }
}

function renderSummaryMarkdown(brief: OperationalBusinessBrief): string {
  const { financials, coverage } = brief;

  return [
    `# Daily Operational Brief — ${brief.workspaceName}`,
    `**As of:** ${coverage.asOfDate} · **Reference month:** ${coverage.referenceMonth}  `,
    `**Coverage:** ${coverage.isPartial ? "Partial sample" : "Complete workspace"}. The operational sample includes records from earlier months.`,
    "",
    "## Financial Activity",
    "| Activity | Records | Amount | Source |",
    "|---|---:|---:|---|",
    `| Invoice drafts | ${financials.drafts.invoiceDraftsCount} | ${formatProvenancedAmount(financials.drafts.invoiceDraftsTotal)} | ${formatAmountSource(financials.drafts.invoiceDraftsTotal.provenance)} |`,
    `| Issued invoices | ${financials.issuedRevenue.count} | ${formatProvenancedAmount(financials.issuedRevenue.total)} | ${formatAmountSource(financials.issuedRevenue.total.provenance)} |`,
    `| Marked paid | ${financials.recordedPaid.count} | ${formatProvenancedAmount(financials.recordedPaid.total)} | ${formatAmountSource(financials.recordedPaid.total.provenance)} |`,
    `| Unpaid invoices (nominal) | ${financials.outstandingBalance.totalCount} | ${formatProvenancedAmount(financials.outstandingBalance.totalAmount)} | ${formatAmountSource(financials.outstandingBalance.totalAmount.provenance)} |`,
    `| Recorded expenses | ${financials.expensesSummary.count} | ${formatProvenancedAmount(financials.expensesSummary.total)} | ${formatAmountSource(financials.expensesSummary.total.provenance)} |`,
    `| Issued this month | ${financials.currentMonthActivity.issuedInvoicesInMonthCount} | ${formatProvenancedAmount(financials.currentMonthActivity.issuedInvoicesInMonthTotal)} | ${formatAmountSource(financials.currentMonthActivity.issuedInvoicesInMonthTotal.provenance)} |`,
    "",
    "Drafts are unissued and excluded from issued revenue. Issued totals include sent, overdue and paid invoices.",
    `**Unpaid invoices:** ${financials.outstandingBalance.overdueCount} overdue (${formatProvenancedAmount(financials.outstandingBalance.overdueAmount)}). Actual outstanding balances cannot be determined without partial payment data.`,
    `**Expenses:** ${financials.expensesSummary.incompleteMetadataCount} with incomplete details; ${financials.expensesSummary.nonDeductibleCount} non-deductible (a valid classification).`,
    "",
    "## Explicit Blind Spots & Boundaries",
    ...brief.blindSpots.map((b) => `- ${b}`),
  ].join("\n");
}

function renderReviewItemMarkdown(
  item: BriefReviewItem,
  brief: OperationalBusinessBrief,
): string {
  const lines: string[] = [
    `# [${item.priority}] ${item.title}`,
    "",
    `**Why this matters today:**  `,
    item.why,
    "",
    ...(item.amount
      ? [
          `**Amount:** **${formatProvenancedAmount(item.amount)}**  `,
          `**Amount source:** ${formatAmountSource(item.amount.provenance)}`,
          "",
        ]
      : []),
    "## Source Records",
    ...item.recordLabels.map(
      (label, idx) => `- \`${item.recordIds[idx] ?? "—"}\` — ${label}`,
    ),
    "",
    "## Suggested Next Step (Read-Only — Never Auto-Executed)",
    item.suggestedAction,
    "",
    "---",
    `_Coverage: ${brief.coverage.badgeLabel}_`,
  ];
  return lines.join("\n");
}

export default function BusinessBriefCommand() {
  const [brief, setBrief] = useState<OperationalBusinessBrief | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FrihetApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadBrief = useCallback(async (opts?: { bypassCache?: boolean }) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const api = createClientFromPreferences();
      const result = await generateOperationalBusinessBrief(api, {
        bypassCache: opts?.bypassCache,
        signal: controller.signal,
      });
      setBrief(result);
    } catch (err) {
      if (
        err instanceof FrihetApiError &&
        err.errorCode === "request_aborted"
      ) {
        return;
      }
      const apiErr =
        err instanceof FrihetApiError
          ? err
          : new FrihetApiError(
              500,
              "unexpected_error",
              err instanceof Error ? err.message : String(err),
            );
      setBrief(null);
      setError(apiErr);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not generate Business Brief",
        message: apiErr.remediation,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrief();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadBrief]);

  const dashboardUrl = buildFrihetDeepLink("dashboard");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={Boolean(brief)}
      searchBarPlaceholder="Filter brief review items and financial buckets..."
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={
            error.isAuthError
              ? "Authentication Required (401)"
              : `Unable to Load Business Brief (${error.statusCode})`
          }
          description={error.remediation}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
              <Action
                title="Retry Brief"
                icon={Icon.RotateClockwise}
                onAction={() => void loadBrief({ bypassCache: true })}
              />
              <Action.OpenInBrowser
                title="Open Frihet Dashboard"
                url={dashboardUrl}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {brief ? (
        <>
          <List.Section
            title={`What to Review Today (${brief.workspaceName})`}
            subtitle={brief.coverage.badgeLabel}
          >
            {brief.reviewItems.map((item) => (
              <List.Item
                key={item.id}
                id={item.id}
                icon={{
                  source: Icon.CheckCircle,
                  tintColor: priorityColor(item.priority),
                }}
                title={item.title}
                subtitle={
                  item.amount
                    ? `${formatProvenancedAmount(item.amount)} · ${formatAmountSource(item.amount.provenance)}`
                    : item.subtitle
                }
                accessories={[
                  {
                    tag: {
                      value: item.priority,
                      color: priorityColor(item.priority),
                    },
                  },
                  {
                    tag: {
                      value: brief.coverage.isPartial
                        ? "Partial Sample"
                        : "Complete",
                      color: brief.coverage.isPartial
                        ? Color.Orange
                        : Color.Green,
                    },
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={renderReviewItemMarkdown(item, brief)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Workspace"
                          text={brief.workspaceName}
                        />
                        <List.Item.Detail.Metadata.TagList title="Priority & Coverage">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={item.priority}
                            color={priorityColor(item.priority)}
                          />
                          <List.Item.Detail.Metadata.TagList.Item
                            text={
                              brief.coverage.isPartial
                                ? "Partial Sample"
                                : "Complete Coverage"
                            }
                            color={
                              brief.coverage.isPartial
                                ? Color.Orange
                                : Color.Green
                            }
                          />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label
                          title="Record IDs"
                          text={item.recordIds.join(", ")}
                        />
                        {item.amount ? (
                          <List.Item.Detail.Metadata.Label
                            title="Amount Source"
                            text={formatAmountSource(item.amount.provenance)}
                          />
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open Section in Frihet"
                      url={item.deepLink}
                    />
                    <Action.CopyToClipboard
                      title="Copy Source Record IDs"
                      content={item.recordIds.join(", ")}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Refresh & Clear Workspace Cache"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => {
                        clearActiveWorkspaceCache();
                        void loadBrief({ bypassCache: true });
                      }}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      onAction={() => void openExtensionPreferences()}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section
            title="Financial Overview & Coverage"
            subtitle={`Currency: ${brief.currency} · Zero writes executed`}
          >
            <List.Item
              id="summary-separation"
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
              title="Financial Activity"
              subtitle={`Issued: ${formatProvenancedAmount(brief.financials.issuedRevenue.total)} · Drafts: ${formatProvenancedAmount(brief.financials.drafts.invoiceDraftsTotal)}`}
              accessories={[
                {
                  tag: {
                    value: brief.coverage.isPartial
                      ? "Partial Sample"
                      : "Complete Coverage",
                    color: brief.coverage.isPartial
                      ? Color.Orange
                      : Color.Green,
                  },
                },
              ]}
              detail={
                <List.Item.Detail markdown={renderSummaryMarkdown(brief)} />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Frihet Dashboard"
                    url={dashboardUrl}
                  />
                  <Action
                    title="Refresh & Clear Workspace Cache"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => {
                      clearActiveWorkspaceCache();
                      void loadBrief({ bypassCache: true });
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

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
  const cur = brief.currency;

  return [
    `# Daily Operational Brief — ${brief.workspaceName}`,
    `**As of:** ${coverage.asOfDate} (\`unfiltered_operational_sample_as_of_date\`) · **Reference Month:** \`${coverage.referenceMonth}\` · **Coverage:** \`${coverage.isPartial ? "PARTIAL SAMPLE" : "COMPLETE WORKSPACE"}\``,
    "",
    "## 4-Way Financial Activity Separation (Operational Sample vs Current Month)",
    "| Bucket | Count | Total | Provenance | Fiscal Meaning |",
    "|---|---:|---:|---|---|",
    `| **1. Drafts (Unissued)** | ${financials.drafts.invoiceDraftsCount} inv / ${financials.drafts.quoteDraftsCount} quo | ${formatProvenancedAmount(financials.drafts.invoiceDraftsTotal)} | \`${financials.drafts.invoiceDraftsTotal.provenance}\` | Not issued; **0.00 ${cur}** revenue |`,
    `| **2. Issued Revenue (Sample)** | ${financials.issuedRevenue.count} inv | **${formatProvenancedAmount(financials.issuedRevenue.total)}** | \`${financials.issuedRevenue.total.provenance}\` | Sent + Overdue + Paid |`,
    `| **3. Recorded Paid** | ${financials.recordedPaid.count} inv | ${formatProvenancedAmount(financials.recordedPaid.total)} | \`${financials.recordedPaid.total.provenance}\` | Marked paid in Frihet |`,
    `| **4. Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales)** | ${financials.outstandingBalance.totalCount} inv (${financials.outstandingBalance.overdueCount} overdue) | **${formatProvenancedAmount(financials.outstandingBalance.totalAmount)}** | \`${financials.outstandingBalance.totalAmount.provenance}\` | ${formatProvenancedAmount(financials.outstandingBalance.overdueAmount)} overdue · ${formatProvenancedAmount(financials.outstandingBalance.onTimeAmount)} on-time |`,
    `| **5. Recorded Expenses** | ${financials.expensesSummary.count} exp (${financials.expensesSummary.incompleteMetadataCount} incomplete) | ${formatProvenancedAmount(financials.expensesSummary.total)} | \`${financials.expensesSummary.total.provenance}\` | ${financials.expensesSummary.nonDeductibleCount} non-deductible (neutral) |`,
    `| **6. Current Month (${financials.currentMonthActivity.referenceMonth})** | ${financials.currentMonthActivity.issuedInvoicesInMonthCount} issued / ${financials.currentMonthActivity.invoiceDraftsInMonthCount} draft / ${financials.currentMonthActivity.expensesInMonthCount} exp | ${formatProvenancedAmount(financials.currentMonthActivity.issuedInvoicesInMonthTotal)} | \`${financials.currentMonthActivity.issuedInvoicesInMonthTotal.provenance}\` | Filtered by document date in ${financials.currentMonthActivity.referenceMonth} |`,
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
          `**Amount & Provenance:** **${formatProvenancedAmount(item.amount)}** (\`${item.amount.provenance}\` — ${item.amount.formula})`,
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
                subtitle={item.subtitle}
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
                            title="Amount & Provenance"
                            text={`${formatProvenancedAmount(item.amount)} (${item.amount.provenance})`}
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
            title="Financial Separation & Coverage Audit"
            subtitle={`Currency: ${brief.currency} · Zero writes executed`}
          >
            <List.Item
              id="summary-separation"
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
              title="4-Way Activity Separation (Drafts vs Issued vs Paid vs Outstanding)"
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

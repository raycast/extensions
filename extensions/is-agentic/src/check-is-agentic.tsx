import { Action, ActionPanel, Clipboard, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { IssueDetail, ReportDetail } from "./components/report-detail";
import { saveReportToHistory } from "./lib/history";
import { getReport, IsAgenticError, normalizeUrl, Report, Tier, tierTitle } from "./lib/is-agentic";

const SCAN_URL = "https://is-agentic.com";

function issueIcon(result: "failed" | "partial"): Icon {
  return result === "failed" ? Icon.XMarkCircle : Icon.ExclamationMark;
}

export default function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments.url ?? "");
  let normalizedUrl = "";
  let inputError: Error | undefined;

  try {
    normalizedUrl = normalizeUrl(searchText);
  } catch (error) {
    inputError = error instanceof Error ? error : new Error("Enter a valid URL.");
  }

  const {
    data: report,
    isLoading,
    error,
  } = useCachedPromise(getReport, [normalizedUrl], {
    execute: Boolean(normalizedUrl) && !inputError,
    keepPreviousData: true,
  });
  const displayError = inputError ?? error;

  useEffect(() => {
    if (report) void saveReportToHistory(report);
  }, [report]);

  async function copyReport() {
    if (!report) return;
    await Clipboard.copy(JSON.stringify(report, null, 2));
    await showToast({ style: Toast.Style.Success, title: "Report JSON copied" });
  }

  if (displayError) {
    const isMissingReport = displayError instanceof IsAgenticError && displayError.code === "report_not_found";
    return (
      <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Enter a website URL">
        <List.EmptyView
          icon={isMissingReport ? Icon.MagnifyingGlass : Icon.ExclamationMark}
          title={isMissingReport ? "No Completed Report" : "Could Not Check This URL"}
          description={displayError.message}
          actions={
            <ActionPanel>
              {isMissingReport && <Action.OpenInBrowser title="Start a Scan in Is Agentic" url={SCAN_URL} />}
              {displayError instanceof IsAgenticError && displayError.resolution && (
                <Action.CopyToClipboard title="Copy Resolution" content={displayError.resolution} />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!report) {
    return (
      <List
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Enter a website URL"
      >
        <List.EmptyView
          icon={Icon.Globe}
          title="Check a Website"
          description="Type a URL to view its completed Is Agentic report."
        />
      </List>
    );
  }

  return (
    <ReportList
      report={report}
      isLoading={isLoading}
      searchText={searchText}
      setSearchText={setSearchText}
      copyReport={copyReport}
    />
  );
}

function ReportList({
  report,
  isLoading,
  searchText,
  setSearchText,
  copyReport,
}: {
  report: Report;
  isLoading: boolean;
  searchText: string;
  setSearchText: (value: string) => void;
  copyReport: () => Promise<void>;
}) {
  const tiers: Tier[] = ["essential", "recommended", "bonus"];
  const overviewActions = (
    <ActionPanel>
      <Action.Push title="View Detailed Report" icon={Icon.Sidebar} target={<ReportDetail report={report} />} />
      <Action.OpenInBrowser title="Open Full Report" url={report.report_url} />
      <Action title="Copy Raw Report JSON" icon={Icon.Clipboard} onAction={copyReport} />
      <Action.CopyToClipboard title="Copy Report URL" content={report.report_url} />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter a website URL"
      navigationTitle={`${report.display_target} · ${report.score ?? "—"}/100`}
    >
      <List.Section title={`${report.score ?? "—"}/100 · ${report.score_label}`}>
        <List.Item
          icon={Icon.Gauge}
          title="Detailed Report"
          subtitle={`${report.eligible_checks} eligible checks · scanned ${new Date(report.scanned_at).toLocaleDateString()}`}
          accessories={[{ text: `${report.issues.length} issue${report.issues.length === 1 ? "" : "s"}` }]}
          actions={overviewActions}
        />
      </List.Section>
      {tiers.map((tier) => {
        const issues = report.issues.filter((issue) => issue.tier === tier);
        if (issues.length === 0) return null;
        return (
          <List.Section key={tier} title={`${tierTitle(tier)} · ${issues.length}`}>
            {issues.map((issue) => (
              <List.Item
                key={issue.id}
                icon={issueIcon(issue.result)}
                title={issue.name}
                subtitle={issue.details ?? undefined}
                accessories={[{ tag: issue.result === "failed" ? "Failed" : "Partial" }]}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Evidence and Recommendation" target={<IssueDetail issue={issue} />} />
                    <Action.CopyToClipboard title="Copy Recommendation" content={issue.recommendation ?? ""} />
                    <Action.OpenInBrowser title="Open Full Report" url={report.report_url} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

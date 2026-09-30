import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  domainStatusIcon,
  formatCount,
  formatIndexingProgressRow,
  formatObservedAt,
  formatProgressMarkdown,
  formatTransfer,
  formatTransferProgressRow,
} from "./formatting";
import type { DomainSnapshot, StatusReport } from "./models";
import { loadStatusReport } from "./probe";

type LoadState = {
  isLoading: boolean;
  report?: StatusReport;
  error?: Error;
};

export default function Command() {
  const [state, setState] = useState<LoadState>({ isLoading: true });

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));

    try {
      const report = await loadStatusReport();
      setState({ isLoading: false, report });
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      setState((previous) => ({ ...previous, isLoading: false, error: normalizedError }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load File Provider progress",
        message: normalizedError.message,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.error && !state.report) {
    return <ErrorDetail error={state.error} onRefresh={load} />;
  }

  const domains = state.report?.domains ?? [];

  return (
    <List isLoading={state.isLoading} isShowingDetail searchBarPlaceholder="Search File Provider domains" throttle>
      {domains.length === 0 && !state.isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No File Provider Domains Found"
          description="No cloud sync providers using Apple's File Provider system were detected on this Mac."
          actions={<CommonActions onRefresh={load} report={state.report} />}
        />
      ) : (
        domains.map((domain) => (
          <DomainItem
            key={`${domain.providerId}/${domain.domainId}`}
            domain={domain}
            report={state.report}
            onRefresh={load}
          />
        ))
      )}
    </List>
  );
}

function DomainItem({
  domain,
  report,
  onRefresh,
}: {
  domain: DomainSnapshot;
  report: StatusReport | undefined;
  onRefresh: () => Promise<void>;
}) {
  const markdown = useMemo(() => domainMarkdown(domain, report), [domain, report]);

  return (
    <List.Item
      title={domain.displayName}
      icon={domainStatusIcon(domain)}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={<DomainActions domain={domain} report={report} onRefresh={onRefresh} />}
    />
  );
}

function DomainActions({
  domain,
  report,
  onRefresh,
}: {
  domain: DomainSnapshot;
  report: StatusReport | undefined;
  onRefresh: () => Promise<void>;
}) {
  return (
    <CommonActions onRefresh={onRefresh} report={report}>
      <ActionPanel.Section>
        <Action.ShowInFinder title="Show Location in Finder" path={domain.rootPath} />
        <Action.CopyToClipboard title="Copy Domain JSON" content={JSON.stringify(domain, null, 2)} />
        <Action.CopyToClipboard title="Copy Domain Identifier" content={`${domain.providerId}/${domain.domainId}`} />
        <Action.CopyToClipboard title="Copy Root Path" content={domain.rootPath} />
      </ActionPanel.Section>
    </CommonActions>
  );
}

function CommonActions({
  children,
  onRefresh,
  report,
}: {
  children?: ReactNode;
  onRefresh: () => Promise<void>;
  report: StatusReport | undefined;
}) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void onRefresh()} />
      {report ? (
        <Action
          title="Copy Full Report JSON"
          icon={Icon.Clipboard}
          onAction={() => void Clipboard.copy(JSON.stringify(report, null, 2))}
        />
      ) : null}
      {children}
      <ActionPanel.Section>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ErrorDetail({ error, onRefresh }: { error: Error; onRefresh: () => Promise<void> }) {
  return (
    <Detail
      markdown={`# Could not load File Provider progress\n\n${error.message}`}
      actions={<CommonActions onRefresh={onRefresh} report={undefined} />}
    />
  );
}

function domainMarkdown(domain: DomainSnapshot, report: StatusReport | undefined): string {
  if (domain.probeError) {
    return [`# ${domain.displayName}`, `**Probe error:** ${domain.probeError}`, detailTable(domain, report)].join(
      "\n\n",
    );
  }

  return [`# ${domain.displayName}`, progressTable(domain), detailTable(domain, report)].join("\n\n");
}

function progressTable(domain: DomainSnapshot): string {
  const rows = [
    formatTransferProgressRow("upload", domain.upload),
    formatTransferProgressRow("download", domain.download),
  ];

  if (domain.health.pendingIndexableCount != null && domain.health.totalIndexableCount != null) {
    rows.push(formatIndexingProgressRow(domain.health.pendingIndexableCount, domain.health.totalIndexableCount));
  }

  return [...rows.map(formatProgressMarkdown)].join("\n\n");
}

function detailTable(domain: DomainSnapshot, report: StatusReport | undefined): string {
  const indexing =
    domain.health.pendingIndexableCount != null && domain.health.totalIndexableCount != null
      ? `${formatCount(domain.health.pendingIndexableCount)} pending / ${formatCount(domain.health.totalIndexableCount)} total`
      : "No index total";

  const rows: Array<[string, string]> = [
    ["Provider", domain.providerId],
    ["Domain", domain.domainId],
    ["Root", domain.rootPath],
    ["Uploading", formatTransfer(domain.upload)],
    ["Downloading", formatTransfer(domain.download)],
    ["Indexing", indexing],
    ["Health", healthSummary(domain)],
    ["Observed", formatObservedAt(domain.observedAt)],
  ];

  if (report) {
    rows.push(["Report observed", formatObservedAt(report.observedAt)]);
  }

  return ["## Details", ...rows.map(([label, value]) => `**${label}**\n${value}`)].join("\n\n");
}

function healthSummary(domain: DomainSnapshot): string {
  if (domain.probeError) {
    return "Probe Error";
  }

  const statuses = [
    domain.health.needsAuth ? "Needs Sign-in" : undefined,
    domain.health.needsIndexing ? "Needs Indexing" : undefined,
    domain.health.isActive ? "Active" : undefined,
  ].filter((status): status is string => Boolean(status));

  return statuses.length > 0 ? statuses.join(", ") : "OK";
}

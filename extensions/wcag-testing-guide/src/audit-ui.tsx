import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState, useSyncExternalStore } from "react";
import { showFailureToast } from "@raycast/utils";
import type { AuditSnapshot } from "./audit-store";
import type { JSX } from "react";
import { auditReportHtml } from "./report-html";
import { saveAuditReport } from "./report-export";
import type { ReportMetadata } from "./report-html";
import { criteriaForScope } from "./review-scope";
import type { Criterion, WcagVersion } from "./types";
import type { ReviewScope } from "./review-scope";
import {
  auditReportCsv,
  auditReportMarkdown,
  auditStats,
  auditSummaryMarkdown,
  statusLabel,
} from "./audit";
import type { AuditResult, AuditResults, AuditStatus } from "./audit";

export type SaveAuditResult = (
  criterion: Criterion,
  status: AuditStatus,
  notes: string,
) => Promise<boolean>;

export function statusAppearance(status: AuditStatus) {
  switch (status) {
    case "pass":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "fail":
      return { icon: Icon.XMarkCircle, color: Color.Red };
    case "not-applicable":
      return { icon: Icon.MinusCircle, color: Color.Blue };
    case "not-tested":
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function recordedResultMarkdown(record?: AuditResult): string {
  const status = record?.status ?? "not-tested";
  const lines = [`> **Your test result: ${statusLabel(status)}**`, ""];
  if (record?.notes.trim())
    lines.push(`**Evidence / justification:** ${record.notes.trim()}`, "");
  else if (status === "fail")
    lines.push(
      "**Add evidence:** record steps, actual behavior and affected environment.",
      "",
    );
  if (record?.updatedAt) lines.push(`Last recorded: ${record.updatedAt}`, "");
  lines.push("---", "");
  return lines.join("\n");
}

function ResultForm({
  criterion,
  current,
  initialStatus,
  onSave,
}: {
  criterion: Criterion;
  current?: AuditResult;
  initialStatus: AuditStatus;
  onSave: SaveAuditResult;
}) {
  const { pop } = useNavigation();
  const [status, setStatus] = useState<AuditStatus>(initialStatus);
  const [notes, setNotes] = useState(current?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  return (
    <Form
      navigationTitle={`Test Result · ${criterion.number}`}
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Test Result"
            icon={Icon.CheckCircle}
            onSubmit={async () => {
              if (submitting) return;
              setSubmitting(true);
              const saved = await onSave(criterion, status, notes.trim());
              setSubmitting(false);
              if (saved) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`${criterion.number} ${criterion.title} · Level ${criterion.level}. Record an observed result, not an assumption.`}
      />
      <Form.Dropdown
        id="status"
        title="Result"
        value={status}
        onChange={(value) => setStatus(value as AuditStatus)}
      >
        <Form.Dropdown.Item title="Not tested" value="not-tested" />
        <Form.Dropdown.Item title="Pass" value="pass" />
        <Form.Dropdown.Item title="Fail" value="fail" />
        <Form.Dropdown.Item title="Not applicable" value="not-applicable" />
      </Form.Dropdown>
      <Form.TextArea
        id="notes"
        title={
          status === "not-applicable"
            ? "Why not applicable? (Optional)"
            : "Test notes / evidence"
        }
        placeholder={
          status === "not-applicable"
            ? "Optional: explain why the requirement does not apply to this page, screen or journey."
            : "Environment, steps to reproduce, expected vs actual behavior, screenshot or issue reference…"
        }
        value={notes}
        onChange={(value) => setNotes(value.slice(0, 15000))}
      />
      <Form.Description text="Saved locally in Raycast (up to 15,000 characters). Use Audit Summary to export results. Mark unverified checks as Not tested." />
    </Form>
  );
}

export function ResultActions({
  criterion,
  record,
  onSave,
}: {
  criterion: Criterion;
  record?: AuditResult;
  onSave: SaveAuditResult;
}) {
  const { push } = useNavigation();
  const openEditor = (status: AuditStatus) =>
    push(
      <ResultForm
        criterion={criterion}
        current={record}
        initialStatus={status}
        onSave={onSave}
      />,
    );
  return (
    <ActionPanel.Submenu
      title={`Test Result: ${statusLabel(record?.status ?? "not-tested")}`}
      icon={Icon.CheckCircle}
    >
      <Action
        title="Mark as Pass"
        icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        onAction={() => void onSave(criterion, "pass", record?.notes ?? "")}
      />
      <Action
        title="Mark as Fail…"
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        onAction={() => openEditor("fail")}
      />
      <Action
        title="Mark as Not Applicable"
        icon={Icon.MinusCircle}
        onAction={() => openEditor("not-applicable")}
      />
      <Action
        title="Mark as Not Tested"
        icon={Icon.Circle}
        onAction={() => void onSave(criterion, "not-tested", "")}
      />
      <Action
        title="Edit Result and Evidence"
        icon={Icon.Pencil}
        onAction={() => openEditor(record?.status ?? "not-tested")}
      />
    </ActionPanel.Submenu>
  );
}

type ExportFormValues = ReportMetadata;

function ReportExportForm({
  criteria,
  version,
  scope,
  results,
  projectName,
  format,
}: {
  criteria: Criterion[];
  version: WcagVersion;
  scope: ReviewScope;
  results: AuditResults;
  projectName: string;
  format: "html" | "pdf";
}) {
  const { pop } = useNavigation();
  const [isExporting, setIsExporting] = useState(false);
  const exporting = useRef(false);
  const exportReport = async (metadata: ExportFormValues) => {
    if (exporting.current) return;
    exporting.current = true;
    setIsExporting(true);
    try {
      const html = auditReportHtml(criteria, version, scope, results, metadata);
      const output = await saveAuditReport(html, metadata.project, format);
      if (output.format === "print-ready-html") {
        await showToast({
          style: Toast.Style.Success,
          title: "Print-ready report saved",
          message:
            "PDF could not be generated automatically. Use Cmd+P in your browser, then Save as PDF.",
          primaryAction: {
            title: "Open Print-ready Report",
            onAction: () => void open(output.path),
          },
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: `${output.format.toUpperCase()} report exported`,
          message: "Saved in Downloads",
          primaryAction: {
            title: "Open Report",
            onAction: () => void open(output.path),
          },
        });
      }
      pop();
      await open(output.path);
    } catch (error) {
      await showFailureToast(error, { title: "Could not export audit report" });
    } finally {
      exporting.current = false;
      setIsExporting(false);
    }
  };
  return (
    <Form
      navigationTitle={`Export ${format.toUpperCase()} Report · WCAG ${version}`}
      isLoading={isExporting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Export ${format.toUpperCase()} Report`}
            icon={format === "html" ? Icon.Document : Icon.Download}
            onSubmit={(values: ExportFormValues) => void exportReport(values)}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`WCAG ${version} · ${scope === "AA" ? "A + AA" : scope === "AAA" ? "A + AA + AAA" : "A"}. Generate a standalone report with status cards, findings, full criterion results, official W3C links and author information. Files are saved to Downloads.`}
      />
      <Form.TextField
        id="project"
        title="Project / product"
        placeholder="e.g. Customer Portal"
        defaultValue={projectName}
      />
      <Form.TextArea
        id="scopeDescription"
        title="Pages / journeys"
        placeholder="URLs, screens, features and workflows included in this review"
      />
      <Form.TextField
        id="reviewer"
        title="Audit performed by"
        placeholder="Tester or team (optional)"
      />
      <Form.TextArea
        id="environment"
        title="Test environment"
        placeholder="Browser / device / OS / screen reader / accessibility settings"
      />
      <Form.TextArea
        id="notes"
        title="Additional notes"
        placeholder="Review limitations, exclusions and follow-up actions (optional)"
      />
      <Form.Checkbox
        id="includeSupportLink"
        title="Author footer"
        label="Include optional Buy Me a Coffee link in exported report"
        defaultValue={false}
      />
      <Form.Description
        text={
          format === "html"
            ? "HTML is the recommended accessible format. It includes semantic headings, tables and navigation links, and works offline. Saved locally to Downloads; no audit data is uploaded."
            : "PDF export uses a local Chrome, Edge, Brave or Chromium browser and checks for basic structure tags. Tagged PDF is not a PDF/UA certification: check reading order, tables and links before sharing. If generation fails, a print-ready HTML report opens; press Cmd+P and choose Save as PDF. No audit data is uploaded."
        }
      />
    </Form>
  );
}

type SummaryProps = {
  criteria: Criterion[];
  version: WcagVersion;
  scope: ReviewScope;
  results: AuditResults;
  onReset: (version: WcagVersion) => Promise<boolean>;
  projectName: string;
  auditManagement: JSX.Element;
  ready: boolean;
  loading: boolean;
};
type LiveSummary = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AuditSnapshot;
  getProps: () => SummaryProps;
};

function LiveAuditSummary({ live }: { live: LiveSummary }) {
  useSyncExternalStore(live.subscribe, live.getSnapshot);
  return <AuditSummaryItem {...live.getProps()} live={live} asDetail />;
}

export function AuditSummaryItem({
  criteria,
  version,
  scope,
  results,
  onReset,
  projectName,
  auditManagement,
  ready,
  loading,
  live,
  asDetail = false,
}: SummaryProps & { live: LiveSummary; asDetail?: boolean }) {
  const { push } = useNavigation();
  const stats = auditStats(criteriaForScope(criteria, version, scope), results);
  const summary = auditSummaryMarkdown(
    criteria,
    version,
    scope,
    results,
    projectName,
  );
  const report = auditReportMarkdown(criteria, version, scope, results);
  const csv = auditReportCsv(criteria, version, scope, results);
  const openExport = (format: "html" | "pdf") =>
    push(
      <ReportExportForm
        criteria={criteria}
        version={version}
        scope={scope}
        results={results}
        projectName={projectName}
        format={format}
      />,
    );
  const actions = (
    <ActionPanel>
      {ready && (
        <ActionPanel.Section>
          <Action
            title="Export HTML Report"
            icon={Icon.Document}
            onAction={() => openExport("html")}
          />
          <Action
            title="Export PDF Report"
            icon={Icon.Download}
            onAction={() => openExport("pdf")}
          />
          <Action.CopyToClipboard
            title="Copy Full Audit Report"
            content={report}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Results as CSV"
            content={csv}
            icon={Icon.List}
          />
        </ActionPanel.Section>
      )}
      {ready && auditManagement}
      {ready && (
        <Action
          title="Clear All Results for This WCAG Version"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => void reset()}
        />
      )}
    </ActionPanel>
  );
  const reset = async () => {
    const ok = await confirmAlert({
      title: `Clear WCAG ${version} results?`,
      message: `Delete all recorded WCAG ${version} outcomes for the current named audit, including levels hidden by the filter? This cannot be undone.`,
      primaryAction: {
        title: "Delete All Results",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (ok) await onReset(version);
  };
  if (asDetail)
    return (
      <Detail
        isLoading={loading}
        navigationTitle={`WCAG ${version} Audit Summary · ${projectName}`}
        markdown={
          ready
            ? summary
            : "# Audit unavailable\n\nResults and actions are available after the saved audit loads successfully. Reopen the command if loading failed."
        }
        actions={actions}
      />
    );
  return (
    <List.Item
      id="audit-summary"
      title="Audit Summary"
      subtitle={`${projectName} · ${stats.progress}% reviewed · ${stats.reviewed}/${stats.total} assessed`}
      icon={{
        source: Icon.BarChart,
        tintColor: stats.fail ? Color.Red : Color.Blue,
      }}
      keywords={[
        "results",
        "summary",
        "progress",
        "pass",
        "fail",
        "not applicable",
        "export",
        "audit",
        "create audit",
        "switch audit",
        "manage audits",
        "csv",
        "report",
        "HTML",
        "PDF",
      ]}
      detail={
        <List.Item.Detail
          markdown={
            ready
              ? summary
              : "# Audit unavailable\n\nWait for loading to finish. If loading failed, reopen the command to retry. Saved data has not been changed."
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Audit Summary"
            icon={Icon.BarChart}
            onAction={() => push(<LiveAuditSummary live={live} />)}
          />
          {actions.props.children}
        </ActionPanel>
      }
    />
  );
}

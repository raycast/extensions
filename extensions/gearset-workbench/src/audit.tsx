import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { GearsetClient } from "./api";
import { EmptyConfiguration, ErrorView } from "./components/ErrorView";
import { auditItemTitle, flattenAuditPayload, safeJson } from "./format";
import { getPreferences, requireApiToken } from "./preferences";
import { AuditReportKind, AuditReportRequest } from "./types";

interface AuditFormValues {
  kind: AuditReportKind;
  startDate: Date;
  endDate: Date;
  jobId?: string;
  pipelineId?: string;
}

const KIND_LABELS: Record<AuditReportKind, string> = {
  deployments: "Deployments",
  "ci-runs": "Manually Triggered CI Runs",
  "ci-edits": "CI Job Edit History",
  "pipeline-edits": "Pipeline Edit History",
  "gearset-permissions": "Gearset Permission Changes",
  "role-changes": "Team Member Role Changes",
  delegations: "Delegated Org Grants",
  "delegated-org-usage": "Delegated Org Usage",
  "pipeline-permissions": "Pipeline Permission Changes",
  "ci-job-permissions": "CI Job Permission Changes",
  "connected-services": "Connected Services",
};

function AuditResults({ request }: { request: AuditReportRequest }) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [raw, setRaw] = useState<unknown>();
  const [error, setError] = useState<unknown>();
  const [isLoading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const payload = await new GearsetClient(requireApiToken("audit")).getAuditReport(request);
      setRaw(payload);
      setItems(flattenAuditPayload(payload));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorView title="Gearset audit request failed" error={error} onRetry={load} />;

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder={`Search ${KIND_LABELS[request.kind]}…`}>
      {items.map((item, index) => {
        const title = auditItemTitle(item, index);
        const date = ["Date", "Timestamp", "CreatedAt", "ChangedAt", "StartDateTime"]
          .map((key) => item[key])
          .find((value): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value)));
        const subtitle = ["Status", "Username", "Owner", "TargetUsername", "Action"]
          .map((key) => item[key])
          .find((value): value is string => typeof value === "string" && Boolean(value));
        return (
          <List.Item
            key={`${title}-${index}`}
            icon={Icon.Eye}
            title={title}
            subtitle={subtitle}
            accessories={date ? [{ date: new Date(date) }] : []}
            detail={<List.Item.Detail markdown={`# ${title}\n\n\`\`\`json\n${safeJson(item)}\n\`\`\``} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Audit Entry JSON" content={safeJson(item)} />
                <Action.CopyToClipboard title="Copy Full Report JSON" content={safeJson(raw)} />
                <Action title="Rerun Audit" icon={Icon.ArrowClockwise} onAction={load} />
                <Action.OpenInBrowser title="Open Gearset" url="https://app.gearset.com" />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && !items.length ? <List.EmptyView title="No Gearset audit entries" /> : null}
    </List>
  );
}

export default function Audit() {
  const { push } = useNavigation();
  const preferences = getPreferences();
  const [kind, setKind] = useState<AuditReportKind>("deployments");
  const [jobId, setJobId] = useState("");
  const [pipelineId, setPipelineId] = useState(preferences.pipelineId ?? "");

  if (!preferences.auditApiToken?.trim()) return <EmptyConfiguration kind="audit-token" />;

  const submit = async (values: AuditFormValues) => {
    if (values.startDate >= values.endDate) {
      await showToast({ style: Toast.Style.Failure, title: "Start date must be before end date" });
      return;
    }
    if (
      (values.kind === "ci-runs" || values.kind === "ci-edits" || values.kind === "ci-job-permissions") &&
      !values.jobId?.trim()
    ) {
      await showToast({ style: Toast.Style.Failure, title: "CI job ID is required for this report" });
      return;
    }
    if ((values.kind === "pipeline-edits" || values.kind === "pipeline-permissions") && !values.pipelineId?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Pipeline ID is required for this report" });
      return;
    }
    push(
      <AuditResults
        request={{
          kind: values.kind,
          startDate: values.startDate,
          endDate: values.endDate,
          jobId: values.jobId?.trim() || undefined,
          pipelineId: values.pipelineId?.trim() || undefined,
        }}
      />,
    );
  };

  const needsJobId = kind === "ci-runs" || kind === "ci-edits" || kind === "ci-job-permissions";
  const needsPipelineId = kind === "pipeline-edits" || kind === "pipeline-permissions";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Gearset Audit" icon={Icon.Eye} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Gearset" url="https://app.gearset.com" />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="kind"
        title="Audit Report"
        value={kind}
        onChange={(value) => setKind(value as AuditReportKind)}
      >
        {Object.entries(KIND_LABELS).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        defaultValue={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
      />
      <Form.DatePicker id="endDate" title="End Date" defaultValue={new Date()} />
      {needsJobId ? <Form.TextField id="jobId" title="CI Job ID" value={jobId} onChange={setJobId} /> : null}
      {needsPipelineId ? (
        <Form.TextField id="pipelineId" title="Pipeline ID" value={pipelineId} onChange={setPipelineId} />
      ) : null}
      <Form.Description
        title="Read-only"
        text="Audit commands only read Gearset activity. API access remains subject to your token scopes and license."
      />
    </Form>
  );
}

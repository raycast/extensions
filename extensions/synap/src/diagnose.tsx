import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { diagnose, ConnectionProblem } from "./api/client";
import { useConnection, ConnectionErrorEmptyView } from "./components/connection";

type HealthStatus = "ok" | "attention" | "degraded";

interface HealthSection {
  key: string;
  status: HealthStatus;
  headline: string;
  detail: Record<string, unknown>;
}

interface GlobalHealthReport {
  mode: "global";
  status: HealthStatus;
  summary: string;
  sections: HealthSection[];
}

function isGlobalHealthReport(result: unknown): result is GlobalHealthReport {
  return !!result && typeof result === "object" && (result as { mode?: string }).mode === "global";
}

function statusIcon(status: HealthStatus): { source: Icon; tintColor: Color } {
  switch (status) {
    case "ok":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "attention":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "degraded":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function sectionTitle(key: string): string {
  switch (key) {
    case "stuck_runs":
      return "Stuck Runs";
    case "failed_flows":
      return "Failed Flows";
    case "review_backlog":
      return "Review Backlog";
    case "duplicate_proposals":
      return "Duplicate Proposals";
    case "capabilities":
      return "Capabilities";
    case "agent_activity":
      return "Agent Activity";
    default:
      return key;
  }
}

export default function Diagnose() {
  const { connection, isLoading: connLoading, podKey } = useConnection();
  const connected = connection != null;

  const {
    data: result,
    isLoading: diagnoseLoading,
    revalidate,
    error,
  } = useCachedPromise((_pod: string) => diagnose({}), [podKey], { execute: connected });

  if (!connLoading && !connected) {
    return (
      <List navigationTitle="Diagnose Pod Health">
        <ConnectionErrorEmptyView error={new ConnectionProblem("not-configured", null)} />
      </List>
    );
  }

  const isLoading = connLoading || diagnoseLoading;
  const report = isGlobalHealthReport(result) ? result : null;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={connection?.podName ? `Diagnose — ${connection.podName}` : "Diagnose Pod Health"}
      isShowingDetail={!!report}
    >
      {error ? (
        <ConnectionErrorEmptyView error={error} onRetry={revalidate} />
      ) : !report && !isLoading ? (
        <List.EmptyView icon={Icon.QuestionMark} title="No diagnosis available" />
      ) : report ? (
        <List.Section title={report.summary} subtitle={report.status}>
          {report.sections.map((section) => (
            <List.Item
              key={section.key}
              icon={statusIcon(section.status)}
              title={sectionTitle(section.key)}
              subtitle={section.headline}
              detail={
                <List.Item.Detail
                  markdown={`# ${sectionTitle(section.key)}\n\n${section.headline}\n\n\`\`\`json\n${JSON.stringify(
                    section.detail,
                    null,
                    2
                  )}\n\`\`\``}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

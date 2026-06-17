import { ActionPanel, Action, List, Detail, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

type AxeViolation = {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor" | null;
  help: string;
  description: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
};

type ScanResult = {
  url: string;
  title: string;
  violations: AxeViolation[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
};

const AXLE_API = "https://axle-iota.vercel.app";
const STATEMENT_URL = "https://axle-iota.vercel.app/statement";

const IMPACT_ICON: Record<string, { source: Icon; tintColor?: string }> = {
  critical: { source: Icon.ExclamationMark, tintColor: "#dc2626" },
  serious: { source: Icon.Warning, tintColor: "#ea580c" },
  moderate: { source: Icon.Info, tintColor: "#d97706" },
  minor: { source: Icon.Circle, tintColor: "#2563eb" },
};

export default function Scan(props: LaunchProps<{ arguments: Arguments.Scan }>) {
  const { url } = props.arguments;
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    setResult(null);
    setError(null);
    setLoading(true);

    showToast({
      style: Toast.Style.Animated,
      title: "Scanning",
      message: normalized,
    });

    fetch(`${AXLE_API}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized }),
      signal: controller.signal,
    })
      .then(async (r: Response) => {
        const data = (await r.json()) as ScanResult & { error?: string };
        if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
        setResult(data);
        showToast({
          style: Toast.Style.Success,
          title: `${data.violations.length} violations`,
          message: normalized,
        });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Scan failed";
        setError(msg);
        showToast({
          style: Toast.Style.Failure,
          title: "Scan failed",
          message: msg,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url]);

  if (loading) {
    return <List isLoading={true} searchBarPlaceholder="Scanning…" />;
  }

  if (error) {
    return (
      <List actions={<ScanActions scannedUrl={url} />}>
        <List.EmptyView title="Scan Failed" description={error} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  if (!result) {
    return (
      <List actions={<ScanActions scannedUrl={url} />}>
        <List.EmptyView title="No Results" description="The scan returned no data." icon={Icon.QuestionMark} />
      </List>
    );
  }

  return (
    <List
      navigationTitle={`${result.title || result.url} — ${result.violations.length} rules`}
      searchBarPlaceholder="Filter violations"
      actions={<ScanActions scannedUrl={result.url} />}
    >
      <List.Section title="Summary">
        <List.Item
          title={`${result.summary.critical} critical · ${result.summary.serious} serious · ${result.summary.moderate} moderate · ${result.summary.minor} minor`}
          icon={Icon.BarChart}
        />
      </List.Section>
      {result.violations.length === 0 ? (
        <List.EmptyView
          title="No Violations Found"
          description="This page passed all checked accessibility rules."
          icon={Icon.CheckCircle}
        />
      ) : (
        <List.Section title="Violations">
          {result.violations.map((v) => (
            <List.Item
              key={v.id}
              title={v.help}
              subtitle={v.id}
              accessories={[
                {
                  text: `${v.nodes.length} element${v.nodes.length === 1 ? "" : "s"}`,
                },
                { tag: v.impact ?? "minor" },
              ]}
              icon={IMPACT_ICON[v.impact ?? "minor"]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Details" target={<ViolationDetail violation={v} />} />
                  <Action.OpenInBrowser title="Open WCAG Reference" url={v.helpUrl} />
                  <Action.CopyToClipboard title="Copy Rule ID" content={v.id} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ScanActions({ scannedUrl }: { scannedUrl: string }) {
  const normalized = /^https?:\/\//i.test(scannedUrl) ? scannedUrl : `https://${scannedUrl}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Scanned URL" url={normalized} />
      <Action.OpenInBrowser title="Open Full Report" url={AXLE_API} />
      <Action.OpenInBrowser title="Open Hebrew Accessibility Statement Generator" url={STATEMENT_URL} />
    </ActionPanel>
  );
}

function ViolationDetail({ violation }: { violation: AxeViolation }) {
  const first = violation.nodes[0];
  const md = [
    `# ${violation.help}`,
    "",
    `**Rule:** \`${violation.id}\` · **Impact:** ${violation.impact ?? "minor"}`,
    "",
    violation.description,
    "",
    `---`,
    "",
    `## First affected element`,
    "",
    `\`${first?.target.join(" ")}\``,
    "",
    "```html",
    first?.html ?? "",
    "```",
    "",
    first?.failureSummary ? `> ${first.failureSummary}` : "",
    "",
    `---`,
    "",
    `${violation.nodes.length} element(s) affected in total. [Open full report →](${AXLE_API}/)`,
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open WCAG Reference" url={violation.helpUrl} />
          <Action.CopyToClipboard title="Copy Element HTML" content={first?.html ?? ""} />
        </ActionPanel>
      }
    />
  );
}

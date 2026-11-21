import {
  Action,
  ActionPanel,
  Form,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  answersMatch,
  checkAllDns,
  normalizeDomain,
  RECORD_TYPES,
  type RecordSelection,
  type RecordType,
  type ResolverResult,
} from "./dns";
import { checkGlobalDns, type GlobalResult } from "./global-dns";

type RecordGroup = { type: RecordType; results: ResolverResult[] };
const GLOBAL_TYPES = RECORD_TYPES.filter((type) => type !== "CAA");

function recordsMarkdown(records: { data: string; ttl: number }[]): string {
  return records
    .map((record) => `- \`${record.data}\` — TTL ${record.ttl}s`)
    .join("\n");
}

function recordsText(records: { data: string; ttl: number }[]): string {
  return records
    .map((record) => `${record.data} (TTL ${record.ttl}s)`)
    .join("\n");
}

function diagnosticReport(
  domain: string,
  selection: RecordSelection,
  checkedAt: Date,
  groups: RecordGroup[],
  globalResults: GlobalResult[],
): string {
  const lines = [
    `DNS report for ${domain}`,
    `Record type: ${selection === "ALL" ? "All Common Records" : selection}`,
    `Checked: ${checkedAt.toISOString()}`,
    `Source: ${selection === "ALL" ? "Google Public DNS and Cloudflare 1.1.1.1" : "Globalping probes (locations and resolvers depend on availability)"}`,
    "",
  ];

  if (selection === "ALL") {
    for (const { type, results } of groups) {
      const matches = answersMatch(results, type);
      lines.push(
        `${type} — ${matches === undefined ? "Incomplete" : matches ? "Answers match" : "Answers differ"}`,
      );
      for (const result of results) {
        lines.push(`  ${result.resolver}:`);
        lines.push(
          ...(result.kind === "answer"
            ? result.records.map(
                (record) => `    ${record.data} (TTL ${record.ttl}s)`,
              )
            : [`    ${result.detail}`]),
        );
      }
      lines.push("");
    }
  } else {
    for (const result of globalResults) {
      lines.push(`${result.city}, ${result.country} — ${result.network}`);
      lines.push(`  Resolver: ${result.resolver}`);
      lines.push(
        ...(result.kind === "answer"
          ? result.records.map(
              (record) => `  ${record.data} (TTL ${record.ttl}s)`,
            )
          : [`  ${result.detail ?? result.kind}`]),
      );
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}

function Results({
  domain,
  selection,
}: {
  domain: string;
  selection: RecordSelection;
}) {
  const [groups, setGroups] = useState<RecordGroup[]>([]);
  const [globalResults, setGlobalResults] = useState<GlobalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date>();

  async function refresh() {
    setLoading(true);
    try {
      if (selection === "ALL") {
        setGroups(await checkAllDns(domain));
      } else {
        setGlobalResults(await checkGlobalDns(domain, selection));
      }
      setCheckedAt(new Date());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "DNS lookup failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [domain, selection]);

  const checked = checkedAt
    ? ` · Checked ${checkedAt.toLocaleTimeString()}`
    : "";
  const globalAnswers = globalResults.filter(
    (result) => result.kind === "answer",
  );
  const signatures = globalAnswers.map((result) =>
    [
      ...new Set(
        result.records.map((record) =>
          record.data.trim().toLowerCase().replace(/\.$/, ""),
        ),
      ),
    ]
      .sort()
      .join("\u0000"),
  );
  const globalSummary = globalResults.some(
    (result) => result.kind === "error" || result.kind === "nxdomain",
  )
    ? "Some probes could not provide an answer"
    : signatures.length > 1 &&
        signatures.some((value) => value !== signatures[0])
      ? "Answers differ across checked locations"
      : "Results from available probe locations";
  const report = checkedAt
    ? diagnosticReport(domain, selection, checkedAt, groups, globalResults)
    : undefined;

  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle={`${selection} records for ${domain}`}
    >
      {selection === "ALL" ? (
        groups.map(({ type, results }) => {
          const matches = answersMatch(results, type);
          const summary =
            matches === undefined ? "Incomplete" : matches ? "Match" : "Differ";
          return (
            <List.Section
              key={type}
              title={`${type} · ${summary}${checked}`}
              subtitle="Google and Cloudflare public resolvers"
            >
              {results.map((result) => (
                <List.Item
                  key={`${type}-${result.resolver}`}
                  title={result.resolver}
                  subtitle={
                    result.kind === "answer"
                      ? result.records.map((record) => record.data).join(" · ")
                      : result.detail
                  }
                  accessories={[
                    {
                      text:
                        result.kind === "answer"
                          ? `${result.records.length} record(s)`
                          : result.kind,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={
                        result.kind === "answer"
                          ? recordsMarkdown(result.records)
                          : result.detail
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      {result.kind === "answer" && (
                        <Action.CopyToClipboard
                          title="Copy Records"
                          content={recordsText(result.records)}
                        />
                      )}
                      {report && (
                        <Action.CopyToClipboard
                          title="Copy Diagnostic Report"
                          content={report}
                        />
                      )}
                      <Action title="Refresh" onAction={refresh} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })
      ) : (
        <List.Section
          title={`${globalSummary}${checked}`}
          subtitle="Live Globalping probes; cities depend on availability"
        >
          {globalResults.map((result, index) => (
            <List.Item
              key={`${result.city}-${result.country}-${index}`}
              title={`${result.city}, ${result.country}`}
              subtitle={
                result.kind === "answer"
                  ? result.records.map((record) => record.data).join(" · ")
                  : result.detail
              }
              accessories={[{ text: result.network }]}
              detail={
                <List.Item.Detail
                  markdown={`**Network:** ${result.network}\n\n**Resolver:** ${result.resolver}\n\n${result.kind === "answer" ? recordsMarkdown(result.records) : result.detail}`}
                />
              }
              actions={
                <ActionPanel>
                  {result.kind === "answer" && (
                    <Action.CopyToClipboard
                      title="Copy Records"
                      content={recordsText(result.records)}
                    />
                  )}
                  {report && (
                    <Action.CopyToClipboard
                      title="Copy Diagnostic Report"
                      content={report}
                    />
                  )}
                  <Action title="Refresh" onAction={refresh} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {selection === "ALL" && groups.length > 0 && (
        <List.Section
          title="About these results"
          subtitle="Common record types at this exact name; subdomains are not enumerated"
        />
      )}
    </List>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Check DNS"
            onSubmit={(values: { domain: string; type: RecordSelection }) => {
              try {
                const domain = normalizeDomain(values.domain);
                setError(undefined);
                push(<Results domain={domain} selection={values.type} />);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Invalid domain",
                );
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Dropdown id="type" title="Record Type" defaultValue="A">
        <Form.Dropdown.Item value="ALL" title="All Common Records" />
        {GLOBAL_TYPES.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

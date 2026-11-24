import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_BASE, authHeaders, parseResponse } from "./api";

interface Issue {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  fix: string;
}

interface Audit {
  url: string;
  final_url: string;
  fetched_at: string;
  scores: Record<"overall" | "structural" | "schema" | "content" | "entity" | "questions", number>;
  issues: Issue[];
  issues_truncated: boolean;
}

const SEVERITY = { critical: "🔴", warning: "🟠", info: "🔵" } as const;

function toMarkdown(a: Audit): string {
  const issues = a.issues.length
    ? a.issues.map((i) => `- ${SEVERITY[i.severity] ?? ""} **${i.title}**  \n  ${i.fix}`).join("\n")
    : "No issues found.";
  const more = a.issues_truncated ? "\n\n_Only the top issues are shown._" : "";
  return `# AI answerability: ${a.scores.overall}/100\n\n${a.final_url}\n\n## Issues\n\n${issues}${more}`;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.CheckPage }>) {
  // Opened from a deeplink or a quicklink, the argument can be missing.
  const raw = (props.arguments?.url ?? "").trim();
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const { data, isLoading } = useFetch<Audit>(`${API_BASE}/page-audit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, client: "raycast" }),
    parseResponse,
    keepPreviousData: false,
    execute: raw.length > 0,
    failureToastOptions: { title: "Could not check this page" },
  });

  if (!raw) {
    return <Detail markdown={"Type the page to check after the command, for example `seomatic.ai`."} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? toMarkdown(data) : `Checking ${url}...`}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Overall" text={`${data.scores.overall}/100`} />
            <Detail.Metadata.Label title="Structure" text={`${data.scores.structural}/100`} />
            <Detail.Metadata.Label title="Schema" text={`${data.scores.schema}/100`} />
            <Detail.Metadata.Label title="Content" text={`${data.scores.content}/100`} />
            <Detail.Metadata.Label title="Entities" text={`${data.scores.entity}/100`} />
            <Detail.Metadata.Label title="Questions" text={`${data.scores.questions}/100`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Checked" text={new Date(data.fetched_at).toLocaleString()} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open Page" url={data.final_url} />
            <Action.CopyToClipboard title="Copy Report" content={toMarkdown(data)} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

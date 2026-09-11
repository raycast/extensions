import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { Issue, Report, reportMarkdown, tierTitle } from "../lib/is-agentic";

function IssueDetail({ issue }: { issue: Issue }) {
  return (
    <Detail
      markdown={`# ${issue.name}\n\n**${issue.result === "failed" ? "Failed" : "Partial"} · ${tierTitle(issue.tier)}**\n\n## Evidence\n${issue.details ?? "No evidence was provided."}\n\n## Recommendation\n${issue.recommendation ?? "No recommendation was provided."}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={issue.result === "failed" ? "Failed" : "Partial"}
              color={issue.result === "failed" ? "#D93F0B" : "#D29922"}
            />
            <Detail.Metadata.TagList.Item text={tierTitle(issue.tier)} color="#0969DA" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Recommendation" content={issue.recommendation ?? ""} />
          <Action.CopyToClipboard title="Copy Evidence" content={issue.details ?? ""} />
        </ActionPanel>
      }
    />
  );
}

export function ReportDetail({ report }: { report: Report }) {
  return (
    <Detail
      markdown={reportMarkdown(report)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Score" text={report.score === null ? "Unavailable" : `${report.score}/100`} />
          <Detail.Metadata.Label title="Eligible Checks" text={String(report.eligible_checks)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Essential"
            text={`${report.score_breakdown.essential.earned}/${report.score_breakdown.essential.available} · ${report.score_breakdown.essential.passing}/${report.score_breakdown.essential.total} passing`}
          />
          <Detail.Metadata.Label
            title="Recommended"
            text={`${report.score_breakdown.recommended.earned}/${report.score_breakdown.recommended.available} · ${report.score_breakdown.recommended.passing}/${report.score_breakdown.recommended.total} passing`}
          />
          <Detail.Metadata.Label
            title="Bonus"
            text={`${report.score_breakdown.bonus.points} points · ${report.score_breakdown.bonus.positive_signals} signals`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Scanned" text={new Date(report.scanned_at).toLocaleString()} />
          <Detail.Metadata.Link title="Source" text={report.target} target={report.target} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Full Report" url={report.report_url} />
          <Action.CopyToClipboard title="Copy Report Summary" content={reportMarkdown(report)} />
          <ActionPanel.Section title="Issues">
            {report.issues.map((issue) => (
              <Action.Push
                key={issue.id}
                title={`View ${issue.name}`}
                icon={issue.result === "failed" ? Icon.XMarkCircle : Icon.ExclamationMark}
                target={<IssueDetail issue={issue} />}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export { IssueDetail };

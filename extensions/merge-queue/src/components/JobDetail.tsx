import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useState } from "react";
import { Check, PullRequestSummary } from "../lib/queue";
import { buildCopyText, buildJobMarkdown } from "../lib/report";
import { DetailMetadata, metadataRows, useJobReport } from "./failure";
import { confirmRerunFailedInRun, confirmRerunJob } from "./rerun";

export function JobDetail(props: {
  check: Check & { jobId: number };
  pr?: PullRequestSummary;
  repo?: string;
  sha?: string;
}) {
  const [wantLog, setWantLog] = useState(props.check.state === "failure");
  const report = useJobReport({ ...props, enabled: true, wantLog });
  const { input, failureUrl } = report;
  const { check } = input;

  return (
    <Detail
      isLoading={report.isLoading}
      navigationTitle={check.name}
      markdown={buildJobMarkdown(input)}
      metadata={<DetailMetadata rows={metadataRows(input, failureUrl)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {failureUrl ? (
              <Action.OpenInBrowser
                title={check.state === "failure" ? "Open Failure on GitHub" : "Open on GitHub"}
                url={failureUrl}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Failure Summary"
              content={buildCopyText(input)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {input.log.status === "loaded" ? (
              <Action.CopyToClipboard
                title="Copy Log Excerpt"
                content={input.log.summary.excerpt.join("\n")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            ) : null}
            {!wantLog ? (
              <Action
                title="Load Log"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                onAction={() => setWantLog(true)}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Rerun This Job"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              onAction={() => confirmRerunJob(check, report.revalidate)}
            />
            {check.runId !== undefined ? (
              <Action
                title="Rerun Failed Jobs in Run"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => confirmRerunFailedInRun(check, report.revalidate)}
              />
            ) : null}
            {props.pr ? (
              <Action.OpenInBrowser
                title="Open Pull Request"
                url={props.pr.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            ) : null}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={report.revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { basename } from "node:path";
import { Diagnostic, readDiagnostics } from "./diagnostic-data";
import { markdownText } from "./model";
import { trackingScope } from "./preferences";
import { scopeLabel } from "./tracking";
export default function Diagnostics() {
  const [reports, setReports] = useState<Diagnostic[]>([]),
    [warnings, setWarnings] = useState<string[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    void readDiagnostics(trackingScope())
      .then((result) => {
        setReports(result.reports);
        setWarnings(result.warnings);
      })
      .catch((e) => setWarnings([String(e)]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <List
      isLoading={loading}
      navigationTitle="Recent Diagnostics"
      searchBarPlaceholder="Search recent apps and events"
    >
      <List.Section
        title="Last 7 days · diagnostic events, not continuous usage history"
        subtitle={scopeLabel[trackingScope()]}
      >
        {warnings.length > 0 && (
          <List.Item
            title={`${warnings.length} reports or locations could not be read`}
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={
                    <Detail
                      markdown={warnings.map(markdownText).join("\n\n")}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        )}
        {!loading && !reports.length && (
          <List.Item
            title="No recent reports match this tracking scope"
            subtitle="Reports without app identity require All Resources in preferences"
            icon={Icon.Info}
          />
        )}
        {reports.map((report) => (
          <List.Item
            key={report.path}
            title={report.title}
            subtitle={report.event}
            icon={
              report.event === "Memory snapshot"
                ? Icon.MemoryChip
                : Icon.Document
            }
            accessories={[{ date: new Date(report.timestamp) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Diagnostic Summary"
                  icon={Icon.Eye}
                  target={
                    <Detail
                      markdown={`# ${markdownText(report.title)}\n\n${markdownText(report.date)} · ${markdownText(report.event)}\n\n${markdownText(report.summary)}\n\nSource: ${markdownText(basename(report.path))}`}
                      actions={
                        <ActionPanel>
                          <Action.ShowInFinder path={report.path} />
                          <Action.CopyToClipboard
                            title="Copy Summary"
                            content={`${report.date}\n${report.title}: ${report.event}\n${report.summary}\nSource: ${report.path}`}
                          />
                        </ActionPanel>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

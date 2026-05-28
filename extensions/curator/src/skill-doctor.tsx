import { useEffect, useState } from "react";
import { homedir } from "node:os";
import { List, Icon, Color } from "@raycast/api";
import { getIndex } from "./lib/cache";
import { computeHealth } from "./lib/health";
import { IssueListItem } from "./components/IssueListItem";
import type { HealthIssue, HealthSeverity } from "./lib/types";

const SECTIONS: { sev: HealthSeverity; title: string }[] = [
  { sev: "error", title: "Errors" },
  { sev: "warning", title: "Warnings" },
  { sev: "info", title: "Info" },
];

export default function Command() {
  const [isLoading, setLoading] = useState(true);
  const [issues, setIssues] = useState<HealthIssue[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const index = await getIndex();
        setIssues(computeHealth(index.skills, homedir()));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Filter ${issues.length} issue(s)…`}
    >
      {SECTIONS.map(({ sev, title }) => {
        const group = issues.filter((i) => i.severity === sev);
        if (group.length === 0) return null;
        return (
          <List.Section key={sev} title={`${title} (${group.length})`}>
            {group.map((issue) => (
              <IssueListItem key={issue.id} issue={issue} />
            ))}
          </List.Section>
        );
      })}
      {!isLoading && issues.length === 0 && (
        <List.EmptyView
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          title="No issues"
          description="All skills look healthy."
        />
      )}
    </List>
  );
}

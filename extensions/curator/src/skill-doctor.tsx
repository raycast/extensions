import { List, Icon, Color } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { homedir } from "node:os";
import { getIndex } from "./lib/cache";
import { computeHealth } from "./lib/health";
import { IssueListItem } from "./components/IssueListItem";
import type { HealthSeverity } from "./lib/types";

const SECTIONS: { sev: HealthSeverity; title: string }[] = [
  { sev: "error", title: "Errors" },
  { sev: "warning", title: "Warnings" },
  { sev: "info", title: "Info" },
];

export default function Command() {
  const { isLoading, data: issues } = usePromise(
    async () => {
      const index = await getIndex();
      return computeHealth(index.skills, homedir());
    },
    [],
    {
      onError: (e) => {
        showFailureToast(e, { title: "Couldn't run Skill Doctor" });
      },
    },
  );

  const all = issues ?? [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Filter ${all.length} issue(s)…`}
    >
      {SECTIONS.map(({ sev, title }) => {
        const group = all.filter((i) => i.severity === sev);
        if (group.length === 0) return null;
        return (
          <List.Section key={sev} title={`${title} (${group.length})`}>
            {group.map((issue) => (
              <IssueListItem key={issue.id} issue={issue} />
            ))}
          </List.Section>
        );
      })}
      {!isLoading && all.length === 0 && (
        <List.EmptyView
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          title="No issues"
          description="All skills look healthy."
        />
      )}
    </List>
  );
}

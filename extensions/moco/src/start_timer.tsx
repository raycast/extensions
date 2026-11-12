import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { ActivityStart } from "./commands/activities/components/ActivityStart";
import { fetchProjects } from "./commands/projects/api";
import { Project } from "./commands/projects/types";
import { detectCurrentJira } from "./utils/browser";
import { JiraIssue } from "./utils/jira";
import { makeJiraDefault, makeTimerDefault, scopeForIssue, selectTimerDefaults } from "./utils/jira-defaults";
import { loadJiraDefault, loadTimerDefault, saveJiraDefault, saveTimerDefault } from "./utils/jira-default-storage";
import { finishMenuBarForm } from "./utils/refresh";

interface TimerContext {
  issue?: JiraIssue;
  projects: Project[];
  selection: { projectId: string; taskId: string; notice: string; source: string };
  plainSelection: { projectId: string; taskId: string; notice: string; source: string };
  notice: string;
}

export default function Command() {
  const [context, setContext] = useState<TimerContext>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [plain, setPlain] = useState(false);
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const [detected, projects, defaults] = await Promise.all([
          detectCurrentJira(),
          fetchProjects(),
          loadTimerDefault(),
        ]);
        const scope = detected.issue ? scopeForIssue(detected.issue) : undefined;
        const rule = scope ? await loadJiraDefault(scope) : undefined;
        if (!disposed)
          setContext({
            issue: detected.issue,
            projects,
            selection: selectTimerDefaults(scope, rule, defaults, projects),
            plainSelection: selectTimerDefaults(undefined, undefined, defaults, projects),
            notice: detected.notice,
          });
      } catch {
        if (!disposed)
          setError("Could not load your MOCO projects or saved defaults. Check your MOCO connection and try again.");
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [attempt]);

  if (error)
    return (
      <Detail
        markdown={error}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setError(undefined);
                setContext(undefined);
                setAttempt((n) => n + 1);
              }}
            />
          </ActionPanel>
        }
      />
    );
  if (!context) return <Detail isLoading markdown="Preparing your timer…" />;
  const issue = plain ? undefined : context.issue;
  const scope = issue ? scopeForIssue(issue) : undefined;
  const selection = plain ? context.plainSelection : context.selection;
  return (
    <ActivityStart
      key={plain ? "plain" : (issue?.url ?? "plain")}
      initialDescription={issue?.description ?? ""}
      jiraIssue={issue}
      assignedProjects={context.projects}
      initialSelection={selection}
      contextNotice={plain ? "" : context.notice}
      defaultScopeLabel={scope ? `for ${scope.prefix}-* on ${scope.host}` : "for plain timers"}
      onClearJira={issue ? () => setPlain(true) : undefined}
      onSaveDefaults={async (projectId, taskId) => {
        if (scope) await saveJiraDefault(makeJiraDefault(scope, Number(projectId), Number(taskId), context.projects));
        else await saveTimerDefault(makeTimerDefault(Number(projectId), Number(taskId), context.projects));
      }}
      onSubmitted={finishMenuBarForm}
    />
  );
}

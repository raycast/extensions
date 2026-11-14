import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { ActivityStart } from "./commands/activities/components/ActivityStart";
import { fetchProjects } from "./commands/projects/api";
import { Project } from "./commands/projects/types";
import { detectCurrentJira } from "./utils/browser";
import { JiraIssue } from "./utils/jira";
import {
  isAvailableTimerProject,
  makeJiraDefault,
  makeTimerDefault,
  scopeForIssue,
  selectTimerDefaults,
} from "./utils/jira-defaults";
import { loadJiraDefault, loadTimerDefault, saveJiraDefault, saveTimerDefault } from "./utils/jira-default-storage";
import { finishMenuBarForm } from "./utils/refresh";

interface TimerContext {
  issue?: JiraIssue;
  projects: Project[];
  selection: { projectId: string; taskId: string; notice: string; source: string };
  plainSelection: { projectId: string; taskId: string; notice: string; source: string };
  notice: string;
}

async function loadTimerContext(): Promise<TimerContext> {
  const [detected, assigned, defaults] = await Promise.all([detectCurrentJira(), fetchProjects(), loadTimerDefault()]);
  const projects = assigned.filter(isAvailableTimerProject);
  const scope = detected.issue ? scopeForIssue(detected.issue) : undefined;
  const rule = scope ? await loadJiraDefault(scope) : undefined;
  return {
    issue: detected.issue,
    projects,
    selection: selectTimerDefaults(scope, rule, defaults, projects),
    plainSelection: selectTimerDefaults(undefined, undefined, defaults, projects),
    notice: detected.notice,
  };
}

export default function Command() {
  const [plain, setPlain] = useState(false);
  const {
    data: context,
    isLoading,
    error,
    revalidate,
  } = usePromise(loadTimerContext, [], {
    onError: () => {
      /* The error view below keeps raw request details out of toasts and logs. */
    },
  });
  if (error)
    return (
      <Detail
        markdown="Could not load your MOCO projects or saved defaults. Check your MOCO connection and try again."
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  if (isLoading || !context) return <Detail isLoading markdown="Preparing your timer…" />;
  const issue = plain ? undefined : context.issue;
  const scope = issue ? scopeForIssue(issue) : undefined;
  const selection = plain ? context.plainSelection : context.selection;
  return (
    <ActivityStart
      isRoot
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

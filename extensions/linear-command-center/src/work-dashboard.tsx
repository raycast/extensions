import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { linearOAuth, loadDashboard } from "./api";
import { buildDashboard, statesForIssue } from "./dashboard";
import { IssueListItem } from "./components";

function WorkDashboard() {
  const preferences: Preferences.WorkDashboard = getPreferenceValues();
  const { data, error, isLoading, revalidate } = useCachedPromise(loadDashboard, [], {
    keepPreviousData: true,
  });
  let model;
  let buildError: Error | undefined;
  try {
    model = data ? buildDashboard(data, preferences) : undefined;
  } catch (error) {
    buildError = error instanceof Error ? error : new Error(String(error));
  }
  const visibleError = error || buildError;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search active work, agents, reviews, or issue IDs"
      navigationTitle="Linear Command Center"
    >
      {visibleError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Linear could not refresh"
          description={visibleError.message}
        />
      ) : null}
      {model?.needsYou.length ? (
        <List.Section title="Needs You" subtitle={`${model.needsYou.length}`}>
          {model.needsYou.map((issue) => (
            <IssueListItem
              key={issue.id}
              itemId={`needs-you:${issue.id}`}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {model?.reviews.length ? (
        <List.Section title="Ready for Review" subtitle={`${model.reviews.length}`}>
          {model.reviews.map((issue) => (
            <IssueListItem
              key={issue.id}
              itemId={`review:${issue.id}`}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {model?.agentWork.length ? (
        <List.Section title="Agents Working" subtitle={`${model.agentWork.length}`}>
          {model.agentWork.map((issue) => (
            <IssueListItem
              key={issue.id}
              itemId={`agent:${issue.id}`}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {model?.active.length ? (
        <List.Section title="Active" subtitle={`${model.active.length}`}>
          {model.active.map((issue) => (
            <IssueListItem
              key={issue.id}
              itemId={`active:${issue.id}`}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {model?.todo.length ? (
        <List.Section title="Todo" subtitle={`${model.todo.length}`}>
          {model.todo.map((issue) => (
            <IssueListItem
              key={issue.id}
              itemId={`todo:${issue.id}`}
              issue={issue}
              states={statesForIssue(model, issue)}
              onChanged={revalidate}
            />
          ))}
        </List.Section>
      ) : null}
      {!isLoading && model && !model.issues.length ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing needs attention"
          description="Your active Linear queue is clear."
        />
      ) : null}
    </List>
  );
}

export default withAccessToken(linearOAuth)(WorkDashboard);

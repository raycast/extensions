import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';

import { type CrmTask, listOpenTasks } from './lib/api';
import { AuthError } from './lib/oauth';
import { formatDueDate } from './lib/format';
import { LoginPromptList } from './lib/login-prompt';
import { getWorkspaceUrl } from './lib/preferences';

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

type Bucket = 'Overdue' | 'Today' | 'Upcoming' | 'No due date';

const bucketFor = (task: CrmTask): Bucket => {
  if (!task.dueAt) return 'No due date';
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) return 'No due date';
  const diff = Math.round(
    (startOfDay(due) - startOfDay(new Date())) / 86_400_000,
  );
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  return 'Upcoming';
};

const BUCKET_ORDER: Bucket[] = ['Overdue', 'Today', 'Upcoming', 'No due date'];

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(listOpenTasks);

  if (error instanceof AuthError) {
    return <LoginPromptList />;
  }

  const tasks = data ?? [];
  const grouped = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: tasks.filter((task) => bucketFor(task) === bucket),
  })).filter((group) => group.items.length > 0);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter reminders…">
      {!isLoading && tasks.length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="You're all caught up"
          description="No open tasks or follow-up reminders."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}

      {grouped.map((group) => (
        <List.Section
          key={group.bucket}
          title={group.bucket}
          subtitle={`${group.items.length}`}
        >
          {group.items.map((task) => {
            const due = formatDueDate(task.dueAt);
            return (
              <List.Item
                key={task.id}
                icon={{ source: Icon.Circle, tintColor: due.color }}
                title={task.title ?? 'Untitled task'}
                accessories={[{ tag: { value: due.label, color: due.color } }]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Deserveos"
                      url={`${getWorkspaceUrl()}/object/task/${task.id}`}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ['cmd'], key: 'r' }}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

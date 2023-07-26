import { List, getPreferenceValues, Icon, ActionPanel, Action, useNavigation, Toast, showToast } from '@raycast/api';
import { useEffect, useState } from 'react';
import { MyPreferences, Task, TimeBlock, User } from './types';
import { authenticate, findTasks, getCurrentTimeBlock, getCurrentUser, punchIn, punchOut } from './api';
import { STATUSES, groupTasksByStatus } from './utils';
import TaskDetails from './task-details';

export default function Command() {
  const { push } = useNavigation();
  const [idToken, setIdToken] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User>();
  const [timeBlock, setTimeBlock] = useState<TimeBlock>();
  const preferences = getPreferenceValues<MyPreferences>();

  // Auth
  useEffect(() => {
    setIsLoading(true);

    authenticate(preferences)
      .then((result) => {
        setIdToken(result.id_token);
        return getCurrentUser(result.id_token);
      })
      .then((user) => setCurrentUser(user))
      .catch((e) => {
        console.log('Failed authenticating', e);
        showToast({ title: 'Failed to authenticate', message: e.message ?? e.toString(), style: Toast.Style.Failure });
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Find todays tasks
  useEffect(() => {
    if (idToken && currentUser) {
      setIsLoading(true);

      Promise.all([
        findTasks({ today: true, userId: String(currentUser.id) }, idToken),
        findTasks({ userId: String(currentUser.id), status: 'starttwoweeks' }, idToken),
        getCurrentTimeBlock(idToken),
      ])
        .then(([tasks, upcomingTasks, timeblock]) => {
          setTasks([...(tasks as Task[]), ...(upcomingTasks as Task[])]);
          setTimeBlock(timeblock);
        })
        .finally(() => setIsLoading(false));
    }
  }, [idToken, currentUser]);

  if (!idToken) {
    return (
      <List navigationTitle="My Tasks" isLoading={isLoading}>
        <List.EmptyView title="Not authenticated" />
      </List>
    );
  }

  const grouped = groupTasksByStatus(tasks, timeBlock?.task_id);

  return (
    <List
      navigationTitle="My Tasks"
      searchBarPlaceholder="Filter my tasks by name and tags"
      isLoading={isLoading}
      throttle={true}
    >
      {STATUSES.map((status) => (
        <List.Section key={`section:${status}`} title={status} subtitle={`${grouped[status].length} task(s)`}>
          {grouped[status].map((task, index) => {
            const keywords = task.resources.map((res) => res.name);
            const isPunchedIn = timeBlock?.task_id === task.id;

            return (
              <List.Item
                key={index}
                id={String(task.id)}
                icon={task.percent_complete === 100 ? Icon.Checkmark : Icon.Circle}
                title={task.name}
                subtitle={`${task.project_name} / ${task.parent_group_name}`}
                keywords={keywords}
                accessories={[{ text: keywords.join(', '), icon: task.is_starred ? Icon.Star : null }]}
                actions={
                  <ActionPanel title="Actions">
                    <ActionPanel.Section title="Selected Task">
                      <Action
                        title="View Details"
                        icon={Icon.ArrowRight}
                        onAction={() => push(<TaskDetails task={task} idToken={idToken} />)}
                      />

                      <Action.OpenInBrowser
                        url={`https://app.teamgantt.com/projects/list/edit/${task.id}?ids=${task.project_id}`}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="TimeSheets">
                      {!isPunchedIn && (
                        <Action title="Punch In" icon={Icon.Alarm} onAction={() => punchIn(task.id, idToken)} />
                      )}

                      {isPunchedIn && (
                        <>
                          <Action
                            title="Punch Out"
                            icon={Icon.Alarm}
                            onAction={() => punchOut(timeBlock.id, idToken)}
                          />

                          <Action.OpenInBrowser url={`https://app.teamgantt.com/my-tasks/edit/${task.id}`} />
                        </>
                      )}
                    </ActionPanel.Section>
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

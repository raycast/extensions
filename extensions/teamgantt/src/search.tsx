import { List, getPreferenceValues, Icon, ActionPanel, Action, useNavigation, showToast, Toast } from '@raycast/api';
import { useEffect, useState } from 'react';
import { MyPreferences, Task } from './types';
import { authenticate, findTasks, punchIn } from './api';
import { groupTasksByProject } from './utils';
import TaskDetails from './task-details';

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [idToken, setIdToken] = useState<string>();
  const [query, setQuery] = useState<string>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const preferences = getPreferenceValues<MyPreferences>();

  // Auth
  useEffect(() => {
    setIsLoading(true);

    authenticate(preferences)
      .then(({ id_token }) => {
        setIdToken(id_token);
      })
      .catch((e) => {
        console.log('Failed authenticating', e);
        showToast({ title: 'Failed to authenticate', message: e.message ?? e.toString(), style: Toast.Style.Failure });
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Find tasks
  useEffect(() => {
    if (idToken && query) {
      setIsLoading(true);

      findTasks({ q: query ? query : undefined, showCompleted }, idToken)
        .then((tasks) => {
          setTasks(tasks as Task[]);
        })
        .finally(() => setIsLoading(false));
    }
  }, [idToken, query, showCompleted]);

  const onSearch = (value: string) => {
    setQuery(value ? value : undefined);
  };
  const grouped = groupTasksByProject(tasks);
  const groups = Object.keys(grouped).sort((a, b) => (a > b ? 1 : -1));

  return (
    <List
      searchBarPlaceholder="Search all tasks by name, notes, etc.."
      isLoading={isLoading}
      onSearchTextChange={onSearch}
      throttle={true}
    >
      {groups.map((projectName, sectionIndex) => (
        <List.Section key={`section:${sectionIndex}`} title={projectName}>
          {grouped[projectName]?.map((task, index) => {
            const keywords = task.resources.map((res) => res.name);

            return (
              <List.Item
                key={index}
                id={String(task.id)}
                icon={task.percent_complete === 100 ? Icon.Checkmark : Icon.Circle}
                title={task.name}
                subtitle={task.parent_group_name}
                keywords={keywords}
                accessories={[{ text: keywords.join(', '), icon: task.is_starred ? Icon.Star : null }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Selected Task">
                      <Action
                        title="View Details"
                        icon={Icon.ArrowRight}
                        onAction={() => push(<TaskDetails task={task} idToken={idToken} />)}
                      />

                      <Action.OpenInBrowser
                        url={`https://app.teamgantt.com/projects/list/edit/${task.id}?ids=${task.project_id}`}
                      />
                      <Action title="Punch In" icon={Icon.Clock} onAction={() => punchIn(task.id, idToken)} />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Search Options">
                      <Action
                        title="Toggle Show Completed"
                        icon={Icon.Checkmark}
                        onAction={() => setShowCompleted(!showCompleted)}
                      />
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

import { List, getPreferenceValues, Icon, ActionPanel, Action } from '@raycast/api';
import { useEffect, useState } from 'react';
import { MyPreferences, Task, TimeBlock } from './types';
import { authenticate, findTasks, getCurrentTimeBlock, punchIn, punchOut } from './api';
import { groupTasksByProject } from './utils';

export default function Command() {
  const [idToken, setIdToken] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeBlock, setTimeBlock] = useState<TimeBlock>();
  const preferences = getPreferenceValues<MyPreferences>();

  // Auth
  useEffect(() => {
    setIsLoading(true);

    authenticate(preferences)
      .then(({ id_token }) => {
        setIdToken(id_token);
      })
      .catch((e) => console.log(e))
      .finally(() => setIsLoading(false));
  }, []);

  // Find todays tasks
  useEffect(() => {
    if (idToken) {
      setIsLoading(true);

      Promise.all([findTasks({ today: true }, idToken), getCurrentTimeBlock(idToken)])
        .then(([tasks, timeblock]) => {
          setTasks(tasks as Task[]);
          setTimeBlock(timeblock);
        })
        .finally(() => setIsLoading(false));
    }
  }, [idToken]);

  const grouped = groupTasksByProject(tasks);
  const projectNames = Object.keys(grouped).sort((a, b) => (a > b ? 1 : -1));

  return (
    <List
      navigationTitle="My Tasks"
      searchBarPlaceholder="Filter my tasks by name and tags"
      isLoading={isLoading}
      throttle={true}
    >
      {projectNames.map((projectName, sectionIndex) => (
        <List.Section key={`section:${sectionIndex}`} title={projectName}>
          {grouped[projectName]?.map((task, index) => {
            const keywords = task.resources.map((res) => res.name);
            const isPunchedIn = timeBlock?.task_id === task.id;

            return (
              <List.Item
                key={index}
                id={String(task.id)}
                icon={task.percent_complete === 100 ? Icon.Checkmark : Icon.Circle}
                title={task.name}
                subtitle={task.parent_group_name}
                keywords={keywords}
                actions={
                  <ActionPanel title={`'${task.name}' actions`}>
                    <Action
                      title="Punch Out"
                      onAction={() => timeBlock && punchOut(timeBlock.id, undefined, idToken)}
                    />

                    <Action title="Punch In" onAction={() => punchIn(task.id, idToken)} />
                    {isPunchedIn && <Action.OpenInBrowser url={`https://app.teamgantt.com/my-tasks/edit/${task.id}`} />}
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

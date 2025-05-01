import { useGarudaLaunchContext } from '@hooks/useGarudaLaunchContext';
import { Action, ActionPanel, Keyboard, List, LocalStorage, showToast } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { APPS_KEY } from '@utils/constants';
import { readProjects } from '@utils/helpers';
import { join } from 'path';

interface Props {
  base: string;
  appEntries: { path: string; name: string; hotkey: string }[];
}

export const ProjectsSelection: React.FC<Props> = ({ base, appEntries }) => {
  const { setStage, setSelectedApps } = useGarudaLaunchContext();
  const repos = (() => {
    try {
      return readProjects(base) || [];
    } catch {
      return [];
    }
  })();

  return (
    <List searchBarPlaceholder="Select a project…">
      <List.Section title="Projects">
        {repos.map((proj) => {
          const target = join(base, proj);
          return (
            <List.Item
              key={proj}
              title={proj}
              actions={
                <ActionPanel>
                  {appEntries.map(({ path, name, hotkey }) => (
                    <Action.Open
                      key={path}
                      title={`Open in ${name}`}
                      target={target}
                      application={path}
                      shortcut={{ modifiers: ['cmd'], key: hotkey as Keyboard.KeyEquivalent }}
                    />
                  ))}
                  <Action
                    title="Reset Applications"
                    icon={{ source: 'arrow.counterclockwise' }}
                    onAction={async () => {
                      try {
                        await LocalStorage.removeItem(APPS_KEY);
                        setStage('AppsSetup');
                        setSelectedApps([]);
                        showToast({ title: 'Applications reset successfully' });
                      } catch (error) {
                        showFailureToast(error, { title: 'Failed to reset applications' });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Hotkeys">
        {appEntries.map(({ name, hotkey, path }) => (
          <List.Item key={path} title={`⌘ + ${hotkey} : ${name}`} icon={{ fileIcon: path }} />
        ))}
      </List.Section>
    </List>
  );
};

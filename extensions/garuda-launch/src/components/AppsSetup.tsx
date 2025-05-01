import { useGarudaLaunchContext } from '@hooks/useGarudaLaunchContext';
import { Action, ActionPanel, Form, LocalStorage } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { APPS_KEY } from '@utils/constants';
import { readApplications, validateSelectedApplications } from '@utils/helpers';

export const AppsSetup: React.FC = () => {
  const apps = (() => {
    try {
      return readApplications() || [];
    } catch {
      return [];
    }
  })();

  const { setStage, setSelectedApps } = useGarudaLaunchContext();

  return (
    <Form
      navigationTitle="Select Applications"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue"
            onSubmit={async (values: { apps: string[] }) => {
              const isValid = validateSelectedApplications(values.apps);
              if (!isValid) return;

              try {
                await LocalStorage.setItem(APPS_KEY, JSON.stringify(values.apps));
                setSelectedApps(values.apps);
                setStage('ProjectsSelection');
              } catch (error) {
                showFailureToast(error, { title: 'Could not save selected apps' });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="apps"
        title="Applications"
        info="Search & select up to 10 apps. Drag tags to reorder."
      >
        {apps.map((app) => {
          const name = (app.split('/').pop() || '').replace(/\.app$/, '');
          return (
            <Form.TagPicker.Item key={app} value={app} title={name} icon={{ fileIcon: app }} />
          );
        })}
      </Form.TagPicker>
    </Form>
  );
};

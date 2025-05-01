import { useGarudaLaunchContext } from '@hooks/useGarudaLaunchContext';
import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from '@raycast/api';
import { APPS_KEY } from '@utils/constants';
import { readApplications } from '@utils/helpers';

export const AppsSetup: React.FC = () => {
  const apps = readApplications();
  const { setStage, setSelectedApps } = useGarudaLaunchContext();

  return (
    <Form
      navigationTitle="Select Applications"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue"
            onSubmit={async (values: { apps: string[] }) => {
              if (!values.apps.length) {
                showToast({ style: Toast.Style.Failure, title: 'Select at least one app' });
                return;
              }
              if (values.apps.length > 10) {
                showToast({ style: Toast.Style.Failure, title: 'Max 10 apps allowed' });
                return;
              }
              await LocalStorage.setItem(APPS_KEY, JSON.stringify(values.apps));
              setSelectedApps(values.apps);
              setStage('ProjectsSelection');
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
          const name = app
            .split('/')
            .pop()!
            .replace(/\.app$/, '');
          return (
            <Form.TagPicker.Item key={app} value={app} title={name} icon={{ fileIcon: app }} />
          );
        })}
      </Form.TagPicker>
    </Form>
  );
};

import { Action, ActionPanel, Application, Form, Icon, getApplications } from '@raycast/api';
import { keyMap } from '../../constants/keyMap';
import { modifiers as modifierOptions } from '../../constants/modifiers';
import { Resource } from '../../types/resource';
import { useEffect, useState } from 'react';
import WebsiteForm from './WebsiteForm';
import ApplicationForm from './ApplicationForm';

interface ResourceFormProps {
  handleSubmit: (values: Resource) => void;
  defaultValues?: Partial<Resource>;
}

const ResourceForm = ({ handleSubmit, defaultValues }: ResourceFormProps) => {
  const { id, type, key, modifiers } = defaultValues ?? {};
  const [innerType, setInnerType] = useState(type);
  const [applicationOptions, setApplicationOptions] = useState<Application[]>([]);

  useEffect(() => {
    (async () => {
      const installedApplications = await getApplications();

      setApplicationOptions(installedApplications);
    })();
  }, []);

  const getPath = (appName: string) => {
    if (defaultValues?.type === 'application' && defaultValues?.path) {
      return defaultValues.path;
    }

    return applicationOptions.find(app => app.name === appName)?.path;
  };

  return (
    <Form
      navigationTitle={id ? 'Edit Resource' : 'Add Resource'}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Resource"
            onSubmit={formValues => {
              handleSubmit({
                ...defaultValues,
                ...formValues,
                path: getPath(formValues.name),
                id: defaultValues?.id,
              } as Resource);
            }}
          />
        </ActionPanel>
      }
    >
      {id && type ? (
        <Form.Description title="Resource Type" text={type} />
      ) : (
        <Form.Dropdown
          id="type"
          title="Resource Type"
          onChange={val => setInnerType(val as Resource['type'])}
          defaultValue={type}
        >
          <Form.Dropdown.Item value="website" title="Website" icon={Icon.Globe} />
          <Form.Dropdown.Item
            value="application"
            title="Application"
            icon={Icon.AppWindowGrid2x2}
          />
        </Form.Dropdown>
      )}
      {innerType === 'website' ? (
        <WebsiteForm defaultValues={defaultValues} />
      ) : (
        <ApplicationForm defaultValues={defaultValues} applicationOptions={applicationOptions} />
      )}
      <Form.Dropdown id="key" title="Key" defaultValue={key}>
        {Object.keys(keyMap).map(keyOption => (
          <Form.Dropdown.Item key={keyOption} value={keyOption} title={keyOption} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="modifiers" title="Modifiers" defaultValue={modifiers}>
        {modifierOptions.map(modifier => (
          <Form.TagPicker.Item key={modifier} value={modifier} title={modifier} />
        ))}
      </Form.TagPicker>
    </Form>
  );
};

export default ResourceForm;

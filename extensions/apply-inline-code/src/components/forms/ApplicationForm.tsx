import { Application, Form } from '@raycast/api';
import { useEffect, useState } from 'react';

interface ApplicationFormProps {
  defaultValues?: Partial<Application>;
  applicationOptions: Application[];
}

const ApplicationForm = ({ defaultValues, applicationOptions }: ApplicationFormProps) => {
  const { name, path } = defaultValues ?? {};
  const [innerPath, setInnerPath] = useState(path);

  useEffect(() => {
    setInnerPath(path);
  }, [path]);

  useEffect(() => {
    if (applicationOptions.length === 0) return;

    const newPath = applicationOptions.find(app => app.name === name)?.path;

    if (newPath && newPath !== innerPath) {
      setInnerPath(newPath);
    }
  }, [name, applicationOptions]);

  return (
    <>
      <Form.Dropdown id="name" title="Application Name" defaultValue={name}>
        {applicationOptions.map(app => (
          <Form.Dropdown.Item key={app.name} value={app.name} title={app.name} />
        ))}
      </Form.Dropdown>
      {innerPath && <Form.Description title="Application Path" text={innerPath} />}
    </>
  );
};

export default ApplicationForm;

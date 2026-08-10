import { Form } from '@raycast/api';
import { Website } from '../../types/website';

interface WebsiteFormProps {
  defaultValues?: Partial<Website>;
}

const WebsiteForm = ({ defaultValues }: WebsiteFormProps) => {
  const { name, url, matchPattern } = defaultValues ?? {};

  return (
    <>
      <Form.TextField id="name" title="Website Name" defaultValue={name} />
      <Form.TextField id="url" title="URL" defaultValue={url} />
      <Form.TextField id="matchPattern" title="Match Pattern" defaultValue={matchPattern} />
    </>
  );
};

export default WebsiteForm;

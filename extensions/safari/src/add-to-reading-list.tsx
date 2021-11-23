import { ActionPanel, SubmitFormAction, Form, showToast, ToastStyle } from '@raycast/api';
import { useState } from 'react';
import { URL } from 'url';
import { executeJxa } from './shared';

const addToReadingList = async (url: string) =>
  executeJxa(`
    const safari = Application("Safari");
    safari.addReadingListItem("${url}")
  `);

export default function Command() {
  const [url, setUrl] = useState('');

  const handleSubmit = async () => {
    if (url) {
      try {
        const parsedUrl = new URL(url);
        await addToReadingList(parsedUrl.href);
        await showToast(ToastStyle.Success, 'Added to Reading List');
        setUrl('');
      } catch (err) {
        await showToast(ToastStyle.Failure, 'Invalid URL', 'URL must start with http[s]://');
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add to Reading List" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} />
    </Form>
  );
}

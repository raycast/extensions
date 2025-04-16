import { Form, ActionPanel, Action, popToRoot, showToast, Toast } from '@raycast/api';
import { finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import WebSocket from 'ws';
import { loadPrivateKey, loadRelayURLs } from './utils';

useWebSocketImplementation(WebSocket);

type Values = {
  textarea: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    try {
      const pool = new SimplePool();
      const privateKey = loadPrivateKey();
      if (privateKey) {
        const event = finalizeEvent(
          {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: ['client', 'My Client'],
            content: values.textarea,
          },
          privateKey,
        );

        const verified = verifyEvent(event);

        if (verified) {
          const relays = loadRelayURLs();
          await pool.publish(relays, event);

          showToast({ title: 'Note Published', message: 'Your note has been published to Nostr!' });
          popToRoot();
        }
      } else {
        console.log('Private Key is missing.');
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to Publish',
          message: 'Please add your private key in the extension preferences.',
        });
      }
    } catch (error) {
      console.error('Error publishing note:', error);
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Publish',
        message: 'An error occurred while publishing the note.',
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Publish a note to Nostr:" />
      <Form.TextArea id="textarea" title="Note content" placeholder="Enter your note here" />
    </Form>
  );
}

import { Form, ActionPanel, Action, popToRoot, showToast, Toast } from '@raycast/api';
import { finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import { hexToBytes } from '@noble/hashes/utils';
import WebSocket from 'ws';
import { decodePrivateKey, includeClient, loadPrivateKey, loadRelayURLs } from './utils';
import { showFailureToast } from '@raycast/utils';

useWebSocketImplementation(WebSocket);

type Values = {
  textarea: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    const pool = new SimplePool();
    try {
      const privateKey = loadPrivateKey();
      if (privateKey) {
        const hexKey = decodePrivateKey(privateKey);
        const tags: string[][] = [];

        if (includeClient) {
          tags.push(['client', 'nostr-raycast']);
        }

        const event = finalizeEvent(
          {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: tags,
            content: values.textarea,
          },
          hexToBytes(hexKey),
        );

        const verified = verifyEvent(event);

        if (verified) {
          const relays = loadRelayURLs();
          await pool.publish(relays, event);

          showToast({ title: 'Note Published', message: 'Your note has been published to Nostr!' });
          popToRoot();
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: 'Failed to Publish',
            message: 'Event verification failed',
          });
        }
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to Publish',
          message: 'Please add your private key in the extension preferences.',
        });
      }
    } catch (error) {
      console.error('Error publishing note:', error);
      showFailureToast(error, { title: 'Failed to Publish' });
    } finally {
      pool.close([]);
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

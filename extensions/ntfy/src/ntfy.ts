import { closeMainWindow, getPreferenceValues, getSelectedText, showToast, Toast } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';

type Action = {
  action: 'http' | 'view' | 'broadcast';
  label: string;
  url?: string;
  body?: string;
  extras?: Record<string, unknown>;
  intent?: string;
  clear?: boolean;
};

type Message = {
  msgType: 'message' | 'ping' | 'clipboard' | 'link';
  headers?: Record<string, string>;
  body: {
    title: string;
    topic: string;
    tags?: string[];
    message?: string;
    click?: string;
    actions?: Action[];
  };
};

const parseMessage = async (
  { url = '', message = '' }: { url?: string; message?: string },
  topic: string,
): Promise<Message> => {
  const selectedText = await getSelectedText().catch(() => '');
  const normalizedUrl = url?.startsWith('http') ? url : `https://${url}`;
  const isUrl = URL.canParse(normalizedUrl || message || selectedText.trim());

  // Is link
  if (isUrl) {
    const link = normalizedUrl || message || selectedText;
    return {
      msgType: 'link',
      body: {
        topic,
        title: 'Your Link',
        message,
        tags: ['link'],
        actions: [
          {
            action: 'view',
            label: 'Open Link',
            url: link,
          },
        ],
      },
    };
  }

  // Is selected text
  if (!message && !url && selectedText.trim()) {
    return {
      msgType: 'clipboard',
      body: {
        topic,
        title: 'Your Selected Text',
        message: selectedText,
        tags: ['clipboard'],
      },
    };
  }

  // Is message only
  if (message) {
    return { msgType: 'message', body: { topic, title: 'Your Message', message, tags: ['speech_balloon'] } };
  }

  // Is ping
  return {
    msgType: 'ping',
    body: {
      topic,
      title: 'Your Ping',
      message: 'Pong!',
      tags: ['ping_pong'],
    },
  };
};

export default async function main(props: { arguments: Arguments.Ntfy }) {
  try {
    const { defaultTopic, cache, defaultServer } = getPreferenceValues<Preferences>();
    const topic = props.arguments.topic || defaultTopic;

    if (!topic) throw new Error('No topic provided');

    const { headers, msgType, body } = await parseMessage(props.arguments, topic);

    const response = await fetch(defaultServer, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cache ? {} : { Cache: 'no-cache' }),
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(response.status, response.statusText, await response.text());
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    await closeMainWindow();

    showToast({
      style: Toast.Style.Success,
      title: `Sent ${msgType} to: ${topic}`,
    });
  } catch (error) {
    showFailureToast({
      style: Toast.Style.Failure,
      title: 'Failed to Send Notification',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

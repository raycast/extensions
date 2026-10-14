import { AxiosError } from 'axios';
import { AnkiError, AnkiUncertainError } from './AnkiError';

export function describeError(error: unknown) {
  if (error instanceof AnkiUncertainError) {
    return {
      title: 'Could Not Confirm the Change',
      message: error.message,
      advice:
        'Check the note or card in Anki before trying again. The change may already have been saved.',
    };
  }
  if (error instanceof AnkiError) {
    if (error.action === 'updateNote') {
      return {
        title: 'Could Not Finish Updating the Note',
        message: error.message,
        advice: 'Some changes may have been saved. Check the note in Anki before trying again.',
      };
    }
    return {
      title: 'Anki Rejected the Request',
      message: error.message,
      advice:
        'Review the request and try again. Check that the selected deck, note type, and note still exist in Anki.',
    };
  }
  if (error instanceof AxiosError && !error.response) {
    return {
      title: 'Could Not Connect to Anki',
      message: error.message,
      advice:
        'Open Anki and confirm AnkiConnect is enabled. Check that the extension port matches AnkiConnect’s webBindPort (8765 by default).\n\n[Install AnkiConnect](https://ankiweb.net/shared/info/2055492159)',
    };
  }
  return {
    title: 'Could Not Complete the Request',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    advice:
      'Try again. If the problem persists, [report the error](https://github.com/anton-suprun/anki-raycast/issues/new).',
  };
}

export function errorMarkdown(error: unknown) {
  const { title, message, advice } = describeError(error);
  const escapedMessage = message.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, '\\$&');
  return `# ${title}\n\n${escapedMessage}\n\n${advice}`;
}

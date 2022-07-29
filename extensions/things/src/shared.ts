import { showToast, Toast, getPreferenceValues } from '@raycast/api';
import osascript from 'osascript-tag';

type Preferences = {
  thingsAppIdentifier: string;
};

export const preferences: Preferences = getPreferenceValues();

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      if (message.match(/Application can't be found/)) {
        showToast({
          style: Toast.Style.Failure,
          title: 'Application not found',
          message: 'Things must be running',
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: 'Something went wrong',
          message: message,
        });
      }
    }
  }
};

export const thingsNotRunningError = `
  ## Things Not Running

  Please make sure Things is installed and running before using this extension.
`;

export enum ListName {
  Inbox = 'Inbox',
  Today = 'Today',
  Anytime = 'Anytime',
  Upcoming = 'Upcoming',
  Someday = 'Someday',
}

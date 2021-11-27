import { ToastStyle, showToast } from '@raycast/api';
import osascript from 'osascript-tag';

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      if (message.match(/Application can't be found/)) {
        showToast(ToastStyle.Failure, 'Application not found', 'Things must be running');
      } else {
        showToast(ToastStyle.Failure, 'Something went wrong', message);
      }
    }
  }
};

export enum ListName {
  Inbox = 'Inbox',
  Today = 'Today',
  Anytime = 'Anytime',
  Upcoming = 'Upcoming',
  Someday = 'Someday',
}

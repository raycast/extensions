import { runAppleScript } from 'run-applescript';
import { runScreensaver } from './scripts';
import { showToast } from '@raycast/api';

export default async () => {
  try {
    await runAppleScript(runScreensaver);
  } catch (e) {
    showToast({ title: 'Error running Screensaver' });
  }
};

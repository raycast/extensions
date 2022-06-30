import { showToast } from '@raycast/api';
import { runAppleScript } from 'run-applescript';
import { runScreensaver, muteSystem } from './scripts';

export default async () => {
  try {
    await runAppleScript(runScreensaver);
  } catch (e) {
    showToast({ title: 'Error running screensaver' });
  }
  try {
    runAppleScript(muteSystem);
  } catch (e) {
    showToast({ title: 'Failed to mute the system volume' });
  }
};

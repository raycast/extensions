import { runAppleScript } from 'run-applescript';
import { runScreensaver, muteSystem } from './scripts';

export default async () => {
  runAppleScript(runScreensaver);
  runAppleScript(muteSystem);
};

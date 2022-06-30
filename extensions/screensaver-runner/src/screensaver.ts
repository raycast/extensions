import { runAppleScript } from 'run-applescript';
import { runScreensaver } from './scripts';

export default async () => {
  runAppleScript(runScreensaver);
};

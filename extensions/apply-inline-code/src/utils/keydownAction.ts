import { runAppleScript } from '@raycast/utils';
import { keyMap } from '../constants/keyMap';
import { Modifier, Key } from '../types/key';

export const keydownAction = (appName: string) => async (key: Key, modifiers: Modifier[]) => {
  const keyCode = keyMap[key];
  const modifierString = modifiers.map(modifier => `${modifier} down`).join(', ');

  return runAppleScript(`
    tell application "${appName}" to activate
    tell application "System Events"
      key code ${keyCode} ${modifierString ? `using {${modifierString}}` : ''}
    end tell
  `);
};

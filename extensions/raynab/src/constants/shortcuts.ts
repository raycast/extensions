import { type Keyboard } from '@raycast/api';

interface Constants {
  ApproveTransaction: Keyboard.Shortcut;
  ViewInBrowser: Keyboard.Shortcut;
  ToggleFlags: Keyboard.Shortcut;
  Group: Keyboard.Shortcut;
  Sort: Keyboard.Shortcut;
  Timeline: Keyboard.Shortcut;
  Filter: Keyboard.Shortcut;
  Edit: Keyboard.Shortcut;
}

export const Shortcuts: Constants = {
  ApproveTransaction: { modifiers: ['opt'], key: 'a' },
  ViewInBrowser: {
    modifiers: ['cmd'],
    key: 'o',
  },
  ToggleFlags: { modifiers: ['opt'], key: 'f' },
  Group: { modifiers: ['cmd'], key: 'g' },
  Sort: { modifiers: ['cmd'], key: 's' },
  Timeline: { modifiers: ['cmd'], key: 't' },
  Filter: { modifiers: ['cmd'], key: 'f' },
  Edit: { modifiers: ['cmd'], key: 'e' },
};

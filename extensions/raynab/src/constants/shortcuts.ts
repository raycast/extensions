import { type Keyboard } from '@raycast/api';

interface Constants {
  ApproveTransaction: Keyboard.Shortcut;
  DeleteTransaction: Keyboard.Shortcut;
  ViewInBrowser: Keyboard.Shortcut;
  ToggleFlags: Keyboard.Shortcut;
  Group: Keyboard.Shortcut;
  Sort: Keyboard.Shortcut;
  Timeline: Keyboard.Shortcut;
  Filter: Keyboard.Shortcut;
  Edit: Keyboard.Shortcut;
  ShowBudgetProgress: Keyboard.Shortcut;
  EditBudgetCategory: Keyboard.Shortcut;
  CreateNewTransaction: Keyboard.Shortcut;
  ShowTransactionsForCategory: Keyboard.Shortcut;
  TogglePayeeFieldType: Keyboard.Shortcut;
}

export const Shortcuts: Constants = {
  ApproveTransaction: { modifiers: ['opt'], key: 'a' },
  DeleteTransaction: { modifiers: ['opt', 'shift'], key: 'x' },
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
  ShowBudgetProgress: { modifiers: ['cmd', 'shift'], key: 'p' },
  EditBudgetCategory: { modifiers: ['cmd'], key: 'e' },
  CreateNewTransaction: { modifiers: ['opt'], key: 'c' },
  ShowTransactionsForCategory: { modifiers: ['cmd', 'shift'], key: 'enter' },
  TogglePayeeFieldType: { modifiers: ['opt'], key: 'p' },
};

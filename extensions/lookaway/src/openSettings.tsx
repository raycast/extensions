import { runLookAwayCommand } from './utils';

export default async function Command() {
  await runLookAwayCommand('open settings', 'opnstngs', 'Opened settings');
}

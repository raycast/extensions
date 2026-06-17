import { runLookAwayCommand } from './utils';

export default async function Command() {
  await runLookAwayCommand('pause', 'lkwypaus', 'Paused work mode');
}

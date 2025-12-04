import { runLookAwayCommand, REQUIRED_VERSION_FOR_START_STOP } from './utils';

export default async function Command() {
  await runLookAwayCommand('stop lookaway', 'stoplkwy', 'Lookaway stopped', undefined, REQUIRED_VERSION_FOR_START_STOP);
}

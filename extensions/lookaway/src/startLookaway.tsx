import { runLookAwayCommand, REQUIRED_VERSION_FOR_START_STOP } from './utils';

export default async function Command() {
  await runLookAwayCommand(
    'start lookaway',
    'strtlkwy',
    'Lookaway started',
    undefined,
    REQUIRED_VERSION_FOR_START_STOP,
  );
}

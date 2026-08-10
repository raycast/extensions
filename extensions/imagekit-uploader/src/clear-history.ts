import { LocalStorage, showHUD } from '@raycast/api';

export default async function ClearHistoryCommand() {
  await LocalStorage.clear();
  await showHUD('All uploads history cleared');
}

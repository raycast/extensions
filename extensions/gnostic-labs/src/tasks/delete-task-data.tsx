import { showHUD } from '@raycast/api';
import { deleteAllTasks } from '../../lib/storage';

export default async function Command() {
  await deleteAllTasks();
  await showHUD('All task data cleared');
}

import { closeMainWindow } from '@raycast/api';
import { BackupForm } from './backup-form';

export default function ImportAccounts() {
  return <BackupForm mode="import" onDone={closeMainWindow} />;
}

import { closeMainWindow } from '@raycast/api';
import { BackupForm } from './backup-form';

export default function ExportBackup() {
  return <BackupForm mode="export" onDone={closeMainWindow} />;
}

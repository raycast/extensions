import { Action, confirmAlert, showHUD } from '@raycast/api';
import { BACKUP_PATH } from './constants';
import { load_todos_from_selected_file, restore_todos } from './backup';
import { Todo } from './todo';

export function ShowBackupsAction() {
  return (
    <Action.ShowInFinder
      path={BACKUP_PATH}
      title='Show Backups in finder'
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'b' }}
    />
  );
}

export function RestoreBackupAction(props: {
  set_todos: (todo: Todo[]) => void;
  set_dones: (todo: Todo[]) => void;
}) {
  async function OnImport() {
    if (
      !(await confirmAlert({
        title: 'Are you sure?',
        message:
          'Are you sure you want to restore the selected backup? This will remove all your current todos',
      }))
    ) {
      await showHUD('backup restore cancelled');
      return;
    }
    try {
      const todos = await load_todos_from_selected_file();
      restore_todos(todos, props.set_todos, props.set_dones);
    } catch (e) {
      if (e instanceof Error) {
        await showHUD(e.message);
      }
    }
  }

  return (
    <Action
      title='Restore a selected backup'
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
      onAction={OnImport}
    />
  );
}

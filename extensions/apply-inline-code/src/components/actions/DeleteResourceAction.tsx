import { Action, Icon, confirmAlert } from '@raycast/api';

const alertOptions = {
  title: 'Are you sure you want to delete?',
  message: 'This action cannot be undone.',
  icon: Icon.Warning,
};

const DeleteResourceAction = ({ onDelete }: { onDelete: () => void }) => {
  const confirmDelete = async () => {
    if (await confirmAlert(alertOptions)) {
      onDelete();
    }
  };

  return (
    <Action
      icon={Icon.Trash}
      title="Delete Resource"
      shortcut={{ modifiers: ['ctrl'], key: 'x' }}
      onAction={confirmDelete}
    />
  );
};

export default DeleteResourceAction;

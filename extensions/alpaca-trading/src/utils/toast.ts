import { showToast, Toast } from '@raycast/api';

export async function getExtendedToast(options: Toast.Options) {
  const toast = await showToast(options);
  toast.secondaryAction = {
    title: 'Hide',
    shortcut: { modifiers: ['ctrl'], key: 'h' },
    onAction: async () => {
      await toast.hide();
      return false;
    },
  };
  return toast;
}

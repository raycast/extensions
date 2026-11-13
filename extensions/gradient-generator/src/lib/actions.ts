import { Alert, Keyboard, confirmAlert, showToast, Toast } from '@raycast/api';
import { Gradient } from '../types';
import { EntryRef } from './library';
import { library, refreshLibrary } from './use-library';

export const shortcut = (
  key: Keyboard.KeyEquivalent,
  extra: ('shift' | 'opt')[] = [],
): Keyboard.Shortcut => ({
  macOS: { modifiers: ['cmd', ...extra], key },
  Windows: { modifiers: ['ctrl', ...extra], key },
});
export async function saveGradient(g: Gradient, ref?: EntryRef) {
  const saved = await library.save(
    g,
    (label) =>
      confirmAlert({
        title: 'Replace Saved Gradient?',
        message: `Replace all other gradients labeled “${label}”?`,
        primaryAction: {
          title: 'Replace',
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: { title: 'Cancel' },
      }),
    ref,
  );
  if (saved) {
    refreshLibrary();
    await showToast({ style: Toast.Style.Success, title: 'Gradient Saved' });
  }
  return saved;
}

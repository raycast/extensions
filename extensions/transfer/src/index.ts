import { runAppleScript } from 'run-applescript';

import {
  Clipboard,
  closeMainWindow,
  showHUD,
  showToast,
  Toast,
} from '@raycast/api';

import { checkInternet, getSelectedFile } from './utils';

// eslint-disable-next-line max-statements
const command = async () => {
  const toast = await showToast(Toast.Style.Animated, '');

  try {
    const { path, name } = await getSelectedFile();

    await checkInternet();

    toast.title = `Uploading "${name}"`;

    const result = await runAppleScript(`
      set cmd to "curl --upload-file ${path} https://transfer.sh/${name}"
      do shell script cmd
    `);

    if (result.startsWith('https://transfer.sh/')) {
      await Clipboard.copy(result);
      await closeMainWindow();
      await showHUD('🎉 URL copied to clipboard');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    toast.style = Toast.Style.Failure;
    toast.title = 'File upload failed.';
    toast.message = String(error);
  }
};

export default command;

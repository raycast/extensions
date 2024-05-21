import { showToast, Toast, open } from '@raycast/api';
import { pass } from './pass';

const url = 'passwordstore.org';
const fullUrl = `https://www.${url}`;
const toastOpts: Toast.Options = {
  style: Toast.Style.Failure,
  title: 'pass is not installed.',
  message: `Check ${url} for help.`,
  primaryAction: {
    title: `Go to ${fullUrl}`,
    onAction: (toast) => {
      open(fullUrl);
      toast.hide();
    },
  },
};

export default async function checkInstall() {
  try {
    await pass('version');
  } catch (error) {
    console.error(error);
    showToast(toastOpts);
  }
}

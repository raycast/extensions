import { showToast, Clipboard, Toast } from '@raycast/api';

import { getCurrentTimestamp } from './utils';

export default function main() {
  const timestamp = getCurrentTimestamp();
  showToast({
    style: Toast.Style.Success,
    title: 'Copied to clipboard',
  });
  Clipboard.copy(timestamp.toString());
  return null;
}

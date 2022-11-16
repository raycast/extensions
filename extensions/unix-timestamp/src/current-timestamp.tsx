import { Clipboard, showHUD } from '@raycast/api';

import { getCurrentTimestamp } from './utils';

export default async function main() {
  const timestamp = getCurrentTimestamp();
  Clipboard.copy(timestamp.toString());
  await showHUD('Copied to clipboard');
  return null;
}

import { Clipboard } from '@raycast/api';
import { formatJS, copyFormattedJs } from './utils';

export default async () => {
  const out = formatJS((await Clipboard.readText()) || '');
  if (out) {
    await copyFormattedJs(out);
  }
};

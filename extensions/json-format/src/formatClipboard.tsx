import { Clipboard } from '@raycast/api';
import { formatJS } from './utils';

export default async () => {
  await formatJS((await Clipboard.readText()) || '');
};

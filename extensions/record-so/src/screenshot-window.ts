import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://shot?mode=window', 'Pick the window to screenshot');
}

import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://shot?mode=screen', 'Screenshot taken — link opens in your browser');
}

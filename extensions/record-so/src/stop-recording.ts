import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://stop', 'Stopping — the share link opens in your browser');
}

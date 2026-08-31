import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://pause', 'Toggled pause');
}

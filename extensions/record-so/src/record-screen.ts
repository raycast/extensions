import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://record?target=screen', 'Recording starts after the countdown');
}

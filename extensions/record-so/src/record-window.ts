import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://record?target=window', 'Pick the window to record');
}

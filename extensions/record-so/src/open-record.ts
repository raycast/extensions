import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://open', 'Record is open');
}

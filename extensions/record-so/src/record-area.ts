import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://record?target=area', 'Drag out the area to record');
}

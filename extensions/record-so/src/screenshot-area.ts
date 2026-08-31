import { trigger } from './lib/trigger';

export default async function Command() {
  await trigger('recordso://shot?mode=area', 'Drag out the area to screenshot');
}

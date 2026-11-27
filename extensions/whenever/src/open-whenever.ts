import { open } from '@raycast/api';
import { APP_URL } from './urls.ts';

export default async function Command() {
	await open(APP_URL);
}

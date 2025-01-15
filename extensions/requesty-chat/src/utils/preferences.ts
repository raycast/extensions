import { LocalStorage, getPreferenceValues } from '@raycast/api';

interface Preferences {
	apiKey: string;
}

export async function getAPIKey(): Promise<string> {
	const preferences = getPreferenceValues<Preferences>();
	return preferences.apiKey || '';
}

export async function saveAPIKey(apiKey: string): Promise<void> {
	await LocalStorage.setItem('requesty_api_key', apiKey);
}

import { randomUUID } from 'node:crypto';
import { LocalStorage, OAuth } from '@raycast/api';
import { Activity } from './activity.ts';
import { SignInRequired, WheneverClient } from './api.ts';
import { Session } from './session.ts';
import { AUTHORIZE_URL, MCP_URL } from './urls.ts';

const oauth = new OAuth.PKCEClient({
	redirectMethod: OAuth.RedirectMethod.Web,
	providerName: 'Whenever',
	providerIcon: 'icon.png',
	description: 'Connect Whenever to find workflows and run the saved versions you select.',
});
export const session = new Session({
	getTokens: () => oauth.getTokens(),
	setTokens: (tokens) => oauth.setTokens(tokens),
	removeTokens: () => oauth.removeTokens(),
	getClientId: () => LocalStorage.getItem<string>('oauth-client-id'),
	setClientId: (id) => LocalStorage.setItem('oauth-client-id', id),
});
export const api = new WheneverClient(() => session.accessToken());
const activityStorage = {
	get: (key: string) => LocalStorage.getItem<string>(key),
	set: (key: string, value: string) => LocalStorage.setItem(key, value),
	remove: (key: string) => LocalStorage.removeItem(key),
};
export const activityFor = (account: string) => new Activity(activityStorage, account);
const SESSION_KEY = 'connected-session';
export async function accountKey(): Promise<string> {
	if (!(await oauth.getTokens())) throw new SignInRequired();
	const key = await LocalStorage.getItem<string>(SESSION_KEY);
	if (!key) throw new SignInRequired();
	return key;
}
async function redirectURI() {
	// Raycast builds the redirect URI only inside an authorization request, and registration needs it first.
	const request = await oauth.authorizationRequest({
		endpoint: AUTHORIZE_URL,
		clientId: 'registration-preview',
		scope: 'whenever',
	});
	return request.redirectURI;
}
export async function connect() {
	const clientId = await session.register(await redirectURI());
	const request = await oauth.authorizationRequest({
		clientId,
		endpoint: AUTHORIZE_URL,
		scope: 'whenever',
		extraParameters: { resource: MCP_URL },
	});
	const { authorizationCode } = await oauth.authorize(request);
	await session.connect({
		code: authorizationCode,
		verifier: request.codeVerifier,
		redirectURI: request.redirectURI,
	});
	await LocalStorage.setItem(SESSION_KEY, randomUUID());
}
export async function disconnect() {
	const key = await LocalStorage.getItem<string>(SESSION_KEY);
	try {
		await session.disconnect();
	} finally {
		if (key) await activityFor(key).clear();
		await LocalStorage.removeItem(SESSION_KEY);
	}
}

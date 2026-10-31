import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../src/session.ts';

type TokenStore = ConstructorParameters<typeof Session>[0];
type StoredTokens = Awaited<ReturnType<TokenStore['getTokens']>>;
type Setup = {
	expired?: boolean;
	response?: unknown;
	status?: number;
	respond?: (url: string, body: URLSearchParams) => Response | Promise<Response>;
	readTokens?: (tokens: StoredTokens) => StoredTokens | Promise<StoredTokens>;
};

function setup({
	expired = false,
	response = { access_token: 'new', refresh_token: 'rotated', expires_in: 3600 },
	status = 200,
	respond,
	readTokens,
}: Setup = {}) {
	let stored: StoredTokens = {
		accessToken: 'old',
		refreshToken: 'refresh',
		isExpired: () => expired,
	};
	const requests: Array<{ url: string; body: URLSearchParams }> = [];
	const session = new Session(
		{
			getClientId: async () => 'raycast-client',
			setClientId: async () => {},
			getTokens: async () => (readTokens ? readTokens(stored) : stored),
			setTokens: async (value) => {
				stored = {
					accessToken: value.access_token,
					refreshToken: value.refresh_token,
					isExpired: () => false,
				};
			},
			removeTokens: async () => {
				stored = undefined;
			},
		},
		async (url, options) => {
			const body = options?.body;
			assert.ok(typeof body === 'string' || body instanceof URLSearchParams);
			const params = new URLSearchParams(body);
			requests.push({ url: String(url), body: params });
			return respond
				? respond(String(url), params)
				: new Response(JSON.stringify(response), { status });
		},
	);
	return { session, requests, stored: () => stored };
}
test('uses a valid stored token without another request', async () => {
	const service = setup();
	assert.equal(await service.session.accessToken(), 'old');
	assert.equal(service.requests.length, 0);
});
test('rotates an expired token with resource and client binding', async () => {
	const service = setup({ expired: true });
	assert.deepEqual(
		await Promise.all([service.session.accessToken(), service.session.accessToken()]),
		['new', 'new'],
	);
	assert.equal(service.requests.length, 1);
	assert.equal(service.stored()?.refreshToken, 'rotated');
	assert.equal(service.requests[0].body.get('resource'), 'https://mcp.whenever.dev/');
	assert.equal(service.requests[0].body.get('client_id'), 'raycast-client');
});
test('clears a rejected grant and requires browser sign-in', async () => {
	const service = setup({ expired: true, status: 400, response: { error: 'invalid_grant' } });
	await assert.rejects(service.session.accessToken(), /Connect your Whenever account/);
	assert.equal(service.stored(), undefined);
});
test('keeps credentials after a temporary token-service failure', async () => {
	const service = setup({
		expired: true,
		status: 503,
		response: { error: 'temporarily_unavailable' },
	});
	await assert.rejects(service.session.accessToken(), /temporarily/);
	assert.equal(service.stored()?.refreshToken, 'refresh');
});
test('exchanges the browser authorization using PKCE and the exact redirect', async () => {
	const service = setup();
	await service.session.connect({
		code: 'code',
		verifier: 'verifier',
		redirectURI: 'https://raycast.com/redirect/extension',
	});
	const params = service.requests[0].body;
	assert.equal(params.get('code_verifier'), 'verifier');
	assert.equal(params.get('code'), 'code');
	assert.equal(params.get('redirect_uri'), 'https://raycast.com/redirect/extension');
	assert.equal(service.stored()?.accessToken, 'new');
});

test('binds PKCE exchange and refresh to the dynamically registered client', async () => {
	let clientId: string | undefined;
	let tokens: StoredTokens;
	const requests: Array<{ url: string; body: string | URLSearchParams }> = [];
	const session = new Session(
		{
			getClientId: async () => clientId,
			setClientId: async (value) => {
				clientId = value;
			},
			getTokens: async () => tokens,
			setTokens: async (value) => {
				tokens = {
					accessToken: value.access_token,
					refreshToken: value.refresh_token,
					isExpired: () => true,
				};
			},
			removeTokens: async () => {
				tokens = undefined;
			},
		},
		async (url, options) => {
			const body = options?.body;
			assert.ok(typeof body === 'string' || body instanceof URLSearchParams);
			requests.push({ url: String(url), body });
			return new Response(
				JSON.stringify(
					String(url).endsWith('/register')
						? { client_id: 'registered-raycast' }
						: { access_token: 'new', refresh_token: 'refresh', expires_in: 3600 },
				),
			);
		},
	);
	const redirectURI = 'https://raycast.com/redirect?packageName=Extension';
	assert.equal(await session.register(redirectURI), 'registered-raycast');
	assert.deepEqual(JSON.parse(String(requests[0].body)).redirect_uris, [redirectURI]);
	await session.connect({ code: 'one-use', verifier: 'pkce', redirectURI });
	await session.accessToken();
	assert.ok(requests[1].body instanceof URLSearchParams);
	assert.ok(requests[2].body instanceof URLSearchParams);
	assert.equal(requests[1].body.get('client_id'), 'registered-raycast');
	assert.equal(requests[1].body.get('redirect_uri'), redirectURI);
	assert.equal(requests[2].body.get('client_id'), 'registered-raycast');
	assert.equal(requests[2].body.get('grant_type'), 'refresh_token');
});

test('clears native tokens even when remote revocation fails', async () => {
	const service = setup({ status: 503 });
	await assert.rejects(service.session.disconnect(), /revocation/);
	assert.equal(service.stored(), undefined);
});

function delayedRefresh() {
	const entered = Promise.withResolvers<void>();
	const answer = Promise.withResolvers<Response>();
	const service = setup({
		expired: true,
		respond: (url, body) => {
			if (url.endsWith('/token') && body.get('grant_type') === 'refresh_token') {
				entered.resolve();
				return answer.promise;
			}
			return new Response(
				JSON.stringify(
					String(url).endsWith('/register')
						? { client_id: 'new-client' }
						: { access_token: 'new-connection', refresh_token: 'new-refresh', expires_in: 3600 },
				),
			);
		},
	});
	return {
		...service,
		entered: entered.promise,
		finish: () =>
			answer.resolve(
				new Response(
					JSON.stringify({
						access_token: 'stale',
						refresh_token: 'stale-refresh',
						expires_in: 3600,
					}),
				),
			),
	};
}

test('does not restore credentials when a refresh finishes after sign-out', async () => {
	const service = delayedRefresh();
	const rejected = assert.rejects(service.session.accessToken(), /Connect your Whenever account/);
	await service.entered;
	await service.session.disconnect();
	service.finish();
	await rejected;
	assert.equal(service.stored(), undefined);
});

test('does not overwrite a new connection with an older pending refresh', async () => {
	const service = delayedRefresh();
	const rejected = assert.rejects(service.session.accessToken(), /Connect your Whenever account/);
	await service.entered;
	await service.session.register('https://raycast.com/redirect');
	await service.session.connect({
		code: 'new-code',
		verifier: 'pkce',
		redirectURI: 'https://raycast.com/redirect',
	});
	service.finish();
	await rejected;
	assert.equal(service.stored()?.accessToken, 'new-connection');
});

test('rejects a credential read that finishes after failed remote revocation', async () => {
	const entered = Promise.withResolvers<void>();
	const answer = Promise.withResolvers<StoredTokens>();
	let old: StoredTokens;
	let first = true;
	const service = setup({
		expired: true,
		readTokens: (value) => {
			if (!first) return value;
			first = false;
			old = value;
			entered.resolve();
			return answer.promise;
		},
		respond: (url) =>
			new Response(
				JSON.stringify({ access_token: 'stale', refresh_token: 'stale-refresh', expires_in: 3600 }),
				{ status: url.endsWith('/revoke') ? 503 : 200 },
			),
	});
	const rejected = assert.rejects(service.session.accessToken(), /Connect your Whenever account/);
	await entered.promise;
	await assert.rejects(service.session.disconnect(), /revocation/);
	answer.resolve(old);
	await rejected;
	assert.equal(service.stored(), undefined);
});

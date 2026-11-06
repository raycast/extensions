import { SignInRequired } from './api.ts';
import { isRecord, postForm, postJson } from './http.ts';
import { serialized } from './serialized.ts';
import { MCP_URL } from './urls.ts';

type Tokens = { access_token: string; refresh_token: string; expires_in: number };
type StoredTokens = { accessToken: string; refreshToken?: string; isExpired(): boolean };
type TokenStore = {
	getTokens(): Promise<StoredTokens | undefined>;
	setTokens(tokens: Tokens): Promise<void>;
	removeTokens(): Promise<void>;
	getClientId(): Promise<string | undefined>;
	setClientId(id: string): Promise<void>;
};
export class Session {
	private store: TokenStore;
	private fetcher: typeof fetch;
	private refreshing?: Promise<string>;
	private epoch = 0;
	private writes = serialized();
	constructor(store: TokenStore, fetcher: typeof fetch = fetch) {
		this.store = store;
		this.fetcher = fetcher;
	}
	private changeStore(epoch: number, change: () => Promise<void>): Promise<void> {
		return this.writes(async () => {
			if (epoch !== this.epoch) throw new SignInRequired();
			await change();
		});
	}
	private async exchange(params: Record<string, string>): Promise<string> {
		const epoch = this.epoch;
		const clientId = await this.store.getClientId();
		if (!clientId) throw new SignInRequired();
		const response = await postForm(this.fetcher, `${MCP_URL}oauth/token`, {
			...params,
			client_id: clientId,
			resource: MCP_URL,
		});
		const tokens: unknown = await response.json();
		if (epoch !== this.epoch) throw new SignInRequired();
		if (!response.ok) {
			if (
				isRecord(tokens) &&
				(tokens.error === 'invalid_grant' || tokens.error === 'invalid_client')
			) {
				await this.changeStore(epoch, () => this.store.removeTokens());
				throw new SignInRequired();
			}
			throw new Error('Sign-in is temporarily unavailable. Try again later.');
		}
		if (
			!isRecord(tokens) ||
			typeof tokens.access_token !== 'string' ||
			!tokens.access_token ||
			typeof tokens.refresh_token !== 'string' ||
			!tokens.refresh_token ||
			typeof tokens.expires_in !== 'number' ||
			!Number.isFinite(tokens.expires_in) ||
			tokens.expires_in <= 0
		)
			throw new Error('Whenever returned an invalid token response.');
		const saved = {
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expires_in: tokens.expires_in,
		};
		await this.changeStore(epoch, () => this.store.setTokens(saved));
		return tokens.access_token;
	}
	async accessToken(): Promise<string> {
		const epoch = this.epoch;
		const tokens = await this.store.getTokens();
		if (epoch !== this.epoch) throw new SignInRequired();
		if (!tokens) throw new SignInRequired();
		if (!tokens.isExpired()) return tokens.accessToken;
		if (!tokens.refreshToken) throw new SignInRequired();
		if (!this.refreshing)
			this.refreshing = this.exchange({
				grant_type: 'refresh_token',
				refresh_token: tokens.refreshToken,
			}).finally(() => {
				this.refreshing = undefined;
			});
		return this.refreshing;
	}
	async connect(input: { code: string; verifier: string; redirectURI: string }) {
		await this.exchange({
			grant_type: 'authorization_code',
			code: input.code,
			code_verifier: input.verifier,
			redirect_uri: input.redirectURI,
		});
	}
	async register(redirectURI: string): Promise<string> {
		const epoch = ++this.epoch;
		await this.changeStore(epoch, () => this.store.removeTokens());
		const response = await postJson(this.fetcher, `${MCP_URL}oauth/register`, {
			client_name: 'Whenever for Raycast',
			redirect_uris: [redirectURI],
			token_endpoint_auth_method: 'none',
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
		});
		const result: unknown = await response.json();
		if (
			!response.ok ||
			!isRecord(result) ||
			typeof result.client_id !== 'string' ||
			!result.client_id
		)
			throw new Error('Whenever could not register this Raycast connection.');
		const clientId = result.client_id;
		await this.changeStore(epoch, () => this.store.setClientId(clientId));
		return clientId;
	}
	async disconnect() {
		const epoch = ++this.epoch;
		const clientId = await this.store.getClientId();
		const tokens = await this.store.getTokens();
		if (epoch !== this.epoch) throw new SignInRequired();
		try {
			if (tokens && clientId) {
				const response = await postForm(
					this.fetcher,
					`${MCP_URL}oauth/revoke`,
					{ token: tokens.refreshToken ?? tokens.accessToken, client_id: clientId },
					15000,
				);
				if (!response.ok)
					throw new Error('Signed out locally, but server revocation could not be confirmed.');
			}
		} finally {
			await this.changeStore(epoch, () => this.store.removeTokens());
		}
	}
}

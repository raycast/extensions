import { nanoid } from "nanoid";
import { fetch, Response, RequestInit } from "undici";

import { debug } from "@/lib/logger";
import {
	HistoryItem,
	LibraryPlaylists,
	PaginatedResource,
	Recommendation,
	SearchResponse,
	SearchScope,
	Song,
	Storefront,
} from "@/models/music";

import { getToken, getUserToken } from "./token";

interface MusicRequestInit extends RequestInit {
	query?: Record<string, string | number | boolean>;
}

type LibrarySearchScope =
	| "library-albums"
	| "library-artist"
	| "library-music-videos"
	| "library-playlists"
	| "library-songs";

export default class MusicApiClient {
	#baseUrl = new URL(`https://api.music.apple.com`);
	private _authenticated: boolean;

	constructor(authenticated = false) {
		this._authenticated = authenticated;
	}

	get authenticated() {
		// getToken().then((token) => console.log(`JWT ${token}`));
		// getUserToken().then((token) => console.log(`User Token ${token}`));

		return new MusicApiClient(true);
	}

	async request<T>(path: string, request?: MusicRequestInit): Promise<{ data: T; status: number }>;
	async request<T>(path: string, request?: MusicRequestInit, options?: { json: false }): Promise<Response>;
	async request<T = unknown>(
		path: string,
		request?: MusicRequestInit,
		options?: { json: boolean }
	): Promise<Response | { data: T; status: number }> {
		const { token } = await getToken();
		const userToken = await getUserToken();

		const url = this.#baseUrl;
		url.pathname = `/v1/${path}`.replace(/\/+/g, "/");

		if (request?.query) {
			for (const k in request?.query ?? {}) {
				url.searchParams.set(k, request?.query?.[k].toString());
			}
		}

		const requestId = nanoid(5);
		const controller = new AbortController();
		const timeout = setTimeout(() => {
			debug(`[${requestId}] Timed out`);
			controller.abort();
		}, 1000 * 30);

		debug(`[${requestId}] ${request?.method ?? "GET"} - ${url.toString()}`);

		const response = await fetch(url, {
			...request,
			referrerPolicy: "no-referrer",
			signal: request?.signal ?? controller.signal,
			headers: {
				...request?.headers,
				Origin: "https://raycast-music.app",
				Authorization: `Bearer ${token}`,
				...(this._authenticated && { "Music-User-Token": userToken }),
			},
		});

		debug(`[${requestId}] ${response.status} - ${response.statusText}]`);
		clearTimeout(timeout);

		if (options?.json === false) {
			return response;
		}

		const data = await response.json();

		return { data: data as T, status: response.status };
	}

	catalog = {
		search: (query: string, scope: SearchScope[], { storefront }: { storefront: string }) =>
			this.request<SearchResponse>(`/catalog/${storefront}/search`, {
				query: {
					term: query,
					types: scope.join(","),
					limit: 25,
				},
			}),
	};

	playlist = {};

	me = {
		recentlyPlayed: () =>
			this.authenticated.request<PaginatedResource<HistoryItem>>("/me/recent/played/tracks", {
				query: {
					types: ["library-songs", "songs"].join(","),
				},
			}),
		storefront: () => this.authenticated.request<PaginatedResource<Storefront>>("/me/storefront"),
		recommendations: () => this.authenticated.request<PaginatedResource<Recommendation>>("/me/recommendations"),
		isLoggedIn: async () => {
			const res = await this.me.storefront();

			return res.status === 200;
		},
		library: {
			/**
			 * @link https://developer.apple.com/documentation/applemusicapi/get_all_library_songs
			 */
			songs: ({ offset = 0, sort = "dateAdded" }: { offset?: number; sort?: string }) =>
				this.authenticated.request<PaginatedResource<Song>>("/me/library/songs", {
					query: {
						offset: offset.toString(),
						sort: sort,
					},
				}),
			playlist: {
				addTrack: (playlistId: string, trackId: string) =>
					this.authenticated.request<void>(
						`/me/library/playlists/${playlistId}/tracks`,
						{
							method: "POST",
							body: JSON.stringify({
								data: [
									{
										id: trackId,
										type: "songs",
									},
								],
							}),
						},
						{ json: false }
					),
			},
			playlists: () => this.authenticated.request<PaginatedResource<LibraryPlaylists>>("/me/library/playlists"),
			add: async (kind: "songs" | "albums", ...ids: string[]) => {
				const res = await this.authenticated.request(
					"/me/library",
					{
						method: "POST",
						query: {
							[`ids[${kind}]`]: ids.join(","),
						},
					},
					{ json: false }
				);

				if (res.status !== 202) {
					throw new Error("Failed to add to library");
				}

				return res;
			},
			search: (term: string, types: LibrarySearchScope, limit = 25) =>
				this.authenticated.request("/me/library/search", {
					query: {
						term,
						types,
						limit,
					},
				}),
		},
	};
}

export const api = new MusicApiClient();

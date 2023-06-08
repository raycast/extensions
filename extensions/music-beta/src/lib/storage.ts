import { LocalStorage } from "@raycast/api";

import { TokenResponse } from "./apple-music/api/token";

export enum StorageKeys {
	MusicToken = "music-token",
	UserToken = "user-token",
	StoreFront = "store-front",
}

export type IStorage = {
	[StorageKeys.UserToken]: string;
	[StorageKeys.MusicToken]: string;
	[StorageKeys.StoreFront]: string;
};

export class Storage {
	static get<K extends keyof IStorage = keyof IStorage>(key: K): Promise<IStorage[K] | undefined> {
		return LocalStorage.getItem<IStorage[K]>(key.toString());
	}

	static set<K extends keyof IStorage = keyof IStorage>(key: K, value: IStorage[K]): Promise<void> {
		return LocalStorage.setItem(key.toString(), value);
	}

	static remove<K extends keyof IStorage = keyof IStorage>(key: K): Promise<void> {
		return LocalStorage.removeItem(key.toString());
	}

	static get userToken() {
		return Storage.get(StorageKeys.UserToken);
	}

	static get musicToken() {
		return Storage.get(StorageKeys.MusicToken).then((data) =>
			data ? (JSON.parse(data) as TokenResponse) : undefined
		);
	}

	static get storeFront() {
		return Storage.get(StorageKeys.StoreFront);
	}
}

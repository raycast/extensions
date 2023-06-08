export * from "./token";
export { api } from "./music-api";
import { Storage } from "@/lib/storage";

import { api } from "./music-api";
import { ASTrack } from "../scripts/search";

/**
 *
 * Try to find the current track in the Apple Music catalog
 */
export const trackToSong = async <T extends Pick<ASTrack, "name" | "album" | "artist">>(track: T) => {
	let storefront = await Storage.storeFront;

	if (!storefront) {
		storefront = "us";
	}

	const res = await api.catalog.search(`${track.name} ${track.album}`, ["songs"], { storefront });

	const songs = res.data.results.songs.data ?? [];

	return songs.find(
		({ attributes }) =>
			attributes.name === track.name &&
			attributes.albumName === track.album &&
			attributes.artistName === track.artist
	);
};

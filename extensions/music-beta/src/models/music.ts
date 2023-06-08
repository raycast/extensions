export interface Resource<Attributes = unknown, Relationships = never> {
	id: string;
	type: string;
	href?: string;
	attributes: Attributes;
	relationships: Relationships;
}

export type PageMeta = {
	total: number;
	currentSort: string;
	sorts: {
		name: string;
		displayName: string;
	}[];
};

export interface PaginatedResource<T> {
	href: string;
	next: string;
	data: T[];
	meta: PageMeta;
}

export type HistoryItem = Resource<{
	albumName: string;
	genreNames: string[];
	trackNumber: number;
	durationInMillis: number;
	releaseDate: string;
	artwork: Artwork;
	url: string;
	name: string;
	composerName: string;
}>;

export type Storefront = Resource<{
	supportedLanguageTags: string[];
	defaultLanguageTag: string;
	name: string;
	explicitContentPolicy: string;
}>;

type AppleMusicStringForDisplay = {
	stringForDisplay: string;
};

export type Recommendation = Resource<
	{
		reason?: AppleMusicStringForDisplay;
		title: AppleMusicStringForDisplay;
		isGroupRecommendation: false;
		resourceTypes: any[];
		nextUpdateDate: string;
		kind: string;
	},
	{
		contents: {
			href: string;
			data: {
				id: string;
				kind: string;
				attributes: {
					url: string;
					name: string;
					type: string;
					artwork: Artwork;
				};
			}[];
		};
	}
>;

export type SearchScope = "songs" | "albums" | "artists" | "playlists" | "stations";

export interface Artwork {
	width: number;
	height: number;
	url: string;
	bgColor: string;
}

export const Artwork = {
	getUrl: (artwork: Artwork | undefined, w: number, h = w) =>
		artwork ? artwork.url.replace("{w}", w.toString()).replace("{h}", h.toString()) : undefined,
};

export type ContentRating = "clean" | "explicit";

export type Album = Resource<{
	artistName: string;
	artistUrl: string;
	artwork: Artwork;
	audioVariants: string[];
	contentRating: ContentRating;
	copyright: string;
	name: string;
	genreNames: string[];
	isComplete: boolean;
	isSingle: boolean;
	trackCount: number;
	url: string;
	releaseDate: string;
}>;

export type Song = Resource<{
	albumName: string;
	artistName: string;
	artistUrl: string;
	artwork: Artwork;
	attribution: string;
	audioVariants: string[];
	contentRating: ContentRating;
	durationInMillis: number;
	genreNames: string[];
	name: string;
	url: string;
}>;

export type Artist = Resource<{
	artwork: Artwork;
	genreNames: string[];
	name: string;
	url: string;
}>;

export type Station = Resource<{
	artwork: Artwork;
	durationInMillis: number;
	episodeNumber: number;
	contentRating: ContentRating;
	isLive: boolean;
	mediaKind: "audio" | "video";
	name: string;
	url: string;
	stationProviderName: string;
}>;

export type PlaylistType = "editorial" | "external" | "personal-mix" | "replay" | "user-shared";

export type Playlist = Resource<{
	artwork: Artwork;
	curatorName: string;
	description: string;
	isChart: boolean;
	name: string;
	playlistType: PlaylistType;
	url: string;
	trackTypes: "music-videos" | "songs";
}>;

export type SearchResponse = {
	results: {
		songs: PaginatedResource<Song>;
		albums: PaginatedResource<Album>;
		artists: PaginatedResource<Artist>;
		stations: PaginatedResource<Station>;
		playlists: PaginatedResource<Playlist>;
	};
};

export type LibraryPlaylists = Resource<
	{
		artwork?: Artwork;
		canEdit: boolean;
		dateAdded: string;
		url: string;
		hasCatalog: boolean;
		name: string;
		isPublic: boolean;
		trackTypes: string[];
		description: {
			standard: string;
			short: string;
		};
	},
	{
		tracks: PaginatedResource<Song>;
		catalog: PaginatedResource<Playlist>;
	}
>;

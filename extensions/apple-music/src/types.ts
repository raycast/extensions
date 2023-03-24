type AppleMusicArtwork =
  | {
      url: string;
    }
  | undefined;

interface AppleMusicResourceAttributes {
  artwork: AppleMusicArtwork;
  name: string;
  artistName: string | undefined;
  curatorName: string | undefined;
}

export interface AppleMusicResource {
  id: string;
  attributes: AppleMusicResourceAttributes;
  type: "songs" | "albums" | "artists" | "playlists" | "stations";
}

type AppleMusicWrappedResourceList =
  | {
      data: AppleMusicResource[];
    }
  | undefined;

export interface AppleMusicSearchResults {
  songs: AppleMusicWrappedResourceList;
  albums: AppleMusicWrappedResourceList;
  artists: AppleMusicWrappedResourceList;
  playlists: AppleMusicWrappedResourceList;
  stations: AppleMusicWrappedResourceList;
}

interface AppleMusicDisplayString {
  stringForDisplay: string;
}

export interface AppleMusicRecommendation {
  id: string;
  attributes: {
    title: AppleMusicDisplayString;
    reason: AppleMusicDisplayString | undefined;
  };
  relationships: {
    contents: AppleMusicWrappedResourceList;
  };
}

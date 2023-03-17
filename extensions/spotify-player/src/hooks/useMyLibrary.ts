import { useCachedPromise } from "@raycast/utils";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getMySavedTracks } from "../api/getMySavedTracks";
import { getUserPlaylists } from "../api/getUserPlaylists";

type UseMyLibraryProps = {
  options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
  };
};

export function useMyLibrary({ options }: UseMyLibraryProps) {
  const { data = [], error, isLoading } = useCachedPromise(() => Promise.all([getUserPlaylists(), getMySavedAlbums(), getFollowedArtists(), getMySavedTracks({ limit: 50 })]), [],
    {
      keepPreviousData: options?.keepPreviousData,
    });

  const [playlistData, albumData, artistsData, tracksData] = data;

  let albums: SpotifyApi.AlbumSearchResponse["albums"] | undefined = undefined

  if (albumData) {
    albums = {
      ...albumData,
      items: albumData.items.map(album => ({ ...album, ...album.album })),
    }
  }

  let tracks: SpotifyApi.TrackSearchResponse["tracks"] | undefined = undefined

  if (tracksData) {
    tracks = {
      ...tracksData,
      items: tracksData.items.map(track => ({ ...track, ...track.track })),
    }
  }



  return {
    myLibraryData: { playlists: playlistData, artists: artistsData?.artists, albums, tracks },
    myLibraryError: error,
    myLibraryIsLoading: isLoading,
  };
}

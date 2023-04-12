import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-node";
import { Response } from "./interfaces";
import { authorize } from "./oauth";
import { isSpotifyInstalled } from "../utils";
import { getTrack, isRunning, playTrack, setShuffling } from "./applescript";
import { TrackInfo } from "./types";
import { addToSavedTracks, removeFromSavedTracks } from "./util";

export const spotifyApi = new SpotifyWebApi();

async function authorizeIfNeeded(): Promise<void> {
  try {
    const accessToken = await authorize();
    spotifyApi.setAccessToken(accessToken);
  } catch (error) {
    console.error("authorization error:", error);

    showToast({ style: Toast.Style.Failure, title: String(error) });
    return;
  }
}

export const notPlayingErrorMessage = "Spotify Is Not Playing";

export async function likeCurrentlyPlayingTrack(): Promise<Response<TrackInfo> | undefined> {
  const isInstalled = await isSpotifyInstalled();

  if (!isInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "You don't have Spotify Installed",
      message: "Liking songs that're playing on a different device is not supported yet",
    });
    return undefined;
  }

  await authorizeIfNeeded();
  const accessToken = spotifyApi.getAccessToken();
  if (!accessToken) return;

  try {
    const track = await getTrack();
    if (track && track.id) {
      const trackId = track.id.replace("spotify:track:", "");
      try {
        const response = await addToSavedTracks(trackId, accessToken);
        if (response) {
          return { result: track };
        }
      } catch (e: any) {
        return { error: (e as unknown as SpotifyApi.ErrorObject).message };
      }
    } else {
      return { error: "Playing song hasn't been found" };
    }
  } catch (e: any) {
    return { error: e };
  }
}
export async function dislikeCurrentlyPlayingTrack(): Promise<Response<TrackInfo> | undefined> {
  const isInstalled = await isSpotifyInstalled();

  if (!isInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "You don't have Spotify Installed",
      message: "Liking songs that're playing on a different device is not supported yet",
    });
    return undefined;
  }

  await authorizeIfNeeded();
  const accessToken = spotifyApi.getAccessToken();
  if (!accessToken) return;

  try {
    const track = await getTrack();
    if (track && track.id) {
      const trackId = track.id.replace("spotify:track:", "");
      try {
        const response = await removeFromSavedTracks(trackId, accessToken);
        if (response) {
          return { result: track };
        }
      } catch (e: any) {
        return { error: (e as unknown as SpotifyApi.ErrorObject).message };
      }
    } else {
      return { error: "Playing song hasn't been found" };
    }
  } catch (e: any) {
    return { error: e };
  }
}

export function getArtistAlbums(artistId: string | undefined): Response<SpotifyApi.ArtistsAlbumsResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.ArtistsAlbumsResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!artistId) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        spotifyApi.searchAlbums(artistId);
        const response =
          (await spotifyApi
            .getArtistAlbums(artistId, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.ArtistsAlbumsResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [artistId]);

  return response;
}

export async function startPlaySimilar(options: object | undefined): Promise<void> {
  try {
    await authorizeIfNeeded();
    const response =
      (await spotifyApi
        .getRecommendations(options)
        .then((response: { body: any }) => response.body as SpotifyApi.RecommendationsFromSeedsResponse)) ?? undefined;
    const tracks = response.tracks.flatMap((track) => track.uri);
    if (tracks) {
      const isSpotifyRunning = await isRunning();
      if (isSpotifyRunning) {
        await spotifyApi.play({ uris: tracks });
      } else {
        playTrack(tracks[0]);
      }
    }
  } catch (e: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed Playing Similar",
      message: (e as unknown as SpotifyApi.ErrorObject).message,
    });
  }
}

export async function play(uri?: string, context_uri?: string): Promise<void> {
  try {
    const isSpotifyRunning = await isRunning();
    if (isSpotifyRunning) {
      await authorizeIfNeeded();
      await spotifyApi.play({ uris: uri ? [uri] : undefined, context_uri });
    } else {
      await playTrack(uri ?? context_uri ?? "");
    }
  } catch (e: any) {
    const errorMessage = (e as unknown as SpotifyApi.ErrorObject).message;
    if (errorMessage.includes("NO_ACTIVE_DEVICE")) {
      await playTrack(uri ?? context_uri ?? "");
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed Start Playing",
      message: errorMessage,
    });
  }
}

export async function playShuffled(uri: string): Promise<void> {
  try {
    const isSpotifyRunning = await isRunning();
    if (isSpotifyRunning) {
      await authorizeIfNeeded();
      await spotifyApi.setShuffle(true);
      await spotifyApi.play({ context_uri: uri });
    } else {
      setShuffling(true);
      playTrack(uri ?? "");
    }
  } catch (e: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed Playing Shuffled Playlist",
      message: (e as unknown as SpotifyApi.ErrorObject).message,
    });
  }
}

export function useSearch(query: string | undefined): Response<SpotifyApi.SearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.SearchResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!query) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));
      try {
        const response =
          (await spotifyApi
            .search(query, ["track", "artist", "album", "playlist"], { limit: 10 })
            .then((response: { body: any }) => response.body as SpotifyApi.SearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return response;
}

export function useArtistsSearch(query: string | undefined): Response<SpotifyApi.ArtistSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.ArtistSearchResponse>>({ isLoading: false });
  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!query) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .searchArtists(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.ArtistSearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return response;
}

export function getAlbumTracks(albumId: string | undefined): Response<SpotifyApi.AlbumTracksResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.AlbumTracksResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!albumId) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .getAlbumTracks(albumId, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.AlbumTracksResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [albumId]);

  return response;
}

export function useAlbumSearch(query: string | undefined): Response<SpotifyApi.AlbumSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.AlbumSearchResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!query) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .searchAlbums(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.AlbumSearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return response;
}

export function useTrackSearch(query: string | undefined): Response<SpotifyApi.TrackSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.TrackSearchResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!query) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));
      try {
        const response =
          (await spotifyApi
            .searchTracks(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.TrackSearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return response;
}

export async function searchTracks(query: string, limit: number): Promise<Response<SpotifyApi.TrackSearchResponse>> {
  await authorizeIfNeeded();
  try {
    const response = (await spotifyApi
      .searchTracks(query, { limit })
      .then((response: { body: any }) => response.body as SpotifyApi.TrackSearchResponse)
      .catch((error) => {
        return { error: (error as unknown as SpotifyApi.ErrorObject).message };
      })) as SpotifyApi.TrackSearchResponse | undefined;
    return { result: response };
  } catch (e: any) {
    return { error: (e as unknown as SpotifyApi.ErrorObject).message };
  }
}

export function usePlaylistSearch(query: string | undefined): Response<SpotifyApi.PlaylistSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.PlaylistSearchResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      if (!query) {
        setResponse((oldState) => ({ ...oldState, isLoading: false, result: undefined }));
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .searchPlaylists(query, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.PlaylistSearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return response;
}

export function useGetFeaturedPlaylists(): Response<SpotifyApi.ListOfFeaturedPlaylistsResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.ListOfFeaturedPlaylistsResponse>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .getFeaturedPlaylists({ limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.ListOfFeaturedPlaylistsResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return response;
}

export function useGetCategories(): Response<SpotifyApi.MultipleCategoriesResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.MultipleCategoriesResponse>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .getCategories({ limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.MultipleCategoriesResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, []);

  return response;
}

export function useGetCategoryPlaylists(categoryId: string): Response<SpotifyApi.PlaylistSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.PlaylistSearchResponse>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      await authorizeIfNeeded();

      if (cancel) {
        return;
      }
      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const response =
          (await spotifyApi
            .getPlaylistsForCategory(categoryId, { limit: 50 })
            .then((response: { body: any }) => response.body as SpotifyApi.PlaylistSearchResponse)
            .catch((error) => {
              setResponse((oldState) => ({ ...oldState, error: (error as unknown as SpotifyApi.ErrorObject).message }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: (e as unknown as SpotifyApi.ErrorObject).message }));
        }
      } finally {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [categoryId]);

  return response;
}

export async function addTrackToQueue(trackUri: string): Promise<Response<SpotifyApi.AddToQueueResponse>> {
  await authorizeIfNeeded();
  try {
    const response = (await spotifyApi
      .addToQueue(trackUri)
      .then((response: { body: any }) => response.body as SpotifyApi.AddToQueueResponse)
      .catch((error) => {
        return { error: (error as unknown as SpotifyApi.ErrorObject).message };
      })) as SpotifyApi.AddToQueueResponse | undefined;
    return { result: response };
  } catch (e: any) {
    return { error: (e as unknown as SpotifyApi.ErrorObject).message };
  }
}

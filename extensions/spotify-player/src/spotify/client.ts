import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-node";
import { Response } from "./interfaces";
import { authorize } from "./oauth";
import { isRunning, playTrack, setShuffling } from "./applescript";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

export function useArtistAlbums(artistId: string | undefined): Response<SpotifyApi.ArtistsAlbumsResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.ArtistsAlbumsResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();

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

export function useAlbumTracks(albumId: string | undefined): Response<SpotifyApi.AlbumTracksResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.AlbumTracksResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();

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

export function useNowPlaying(): Response<SpotifyApi.CurrentlyPlayingResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.CurrentlyPlayingResponse>>({ isLoading: true });

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      console.log("fetching now playing");
      const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();

      if (cancel) {
        return;
      }

      setResponse((oldState) => ({ ...oldState, isLoading: true }));

      try {
        console.log("trying fetching now playing");
        const response =
          (await spotifyApi
            .getMyCurrentPlayingTrack()
            .then((response: { body: any }) => response.body as SpotifyApi.CurrentlyPlayingResponse)
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

export async function startPlaySimilar(trackIds: string[], artistIds?: string[]): Promise<void> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    const response =
      (await spotifyApi
        .getRecommendations({ seed_tracks: trackIds, seed_artists: artistIds })
        .then((response: { body: any }) => response.body as SpotifyApi.RecommendationsFromSeedsResponse)) ?? undefined;
    const tracks = response.tracks.flatMap((track) => track.uri);
    if (tracks) {
      await spotifyApi.play({ uris: tracks });
    }
  } catch (error: any) {
    return error;
  }
}

export async function play(uri?: string, context_uri?: string): Promise<void> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    await spotifyApi.play({ uris: uri ? [uri] : undefined, context_uri });
  } catch (error: any) {
    return error;
  }
}

export async function pause(): Promise<void> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    await spotifyApi.pause();
  } catch (e: any) {
    return e;
  }
}

export async function skipToNext(): Promise<void> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    await spotifyApi.skipToNext();
  } catch (e: any) {
    return e;
  }
}

export async function skipToPrevious(): Promise<void> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    await spotifyApi.skipToPrevious();
  } catch (e: any) {
    return e;
  }
}

export async function containsMySavedTracks(trackIds: string[]): Promise<SpotifyApi.CheckUsersSavedTracksResponse> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    const response = await spotifyApi.containsMySavedTracks(trackIds).then((response: { body: any }) => response.body);
    return response as SpotifyApi.CheckUsersSavedTracksResponse;
  } catch (error: any) {
    return error;
  }
}

export async function playShuffled(uri: string): Promise<void> {
  try {
    const isSpotifyRunning = await isRunning();
    if (isSpotifyRunning) {
      const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
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

export async function searchTracks(query: string, limit: number): Promise<Response<SpotifyApi.TrackSearchResponse>> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
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

export async function addTrackToQueue(trackUri: string): Promise<Response<SpotifyApi.AddToQueueResponse>> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
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

export async function addToSavedTracks(trackIds: string[]): Promise<Response<SpotifyApi.SaveTracksForUserResponse>> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    const response = (await spotifyApi
      .addToMySavedTracks(trackIds)
      .then((response: { body: any }) => response.body as SpotifyApi.SaveTracksForUserResponse)
      .catch((error) => {
        return { error: (error as unknown as SpotifyApi.ErrorObject).message };
      })) as SpotifyApi.AddToQueueResponse | undefined;
    return { result: response };
  } catch (e: any) {
    return { error: (e as unknown as SpotifyApi.ErrorObject).message };
  }
}

export async function removeFromSavedTracks(
  trackIds: string[]
): Promise<Response<SpotifyApi.SaveTracksForUserResponse>> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();
  try {
    const response = (await spotifyApi
      .removeFromMySavedTracks(trackIds)
      .then((response: { body: any }) => response.body as SpotifyApi.SaveTracksForUserResponse)
      .catch((error) => {
        return { error: (error as unknown as SpotifyApi.ErrorObject).message };
      })) as SpotifyApi.AddToQueueResponse | undefined;
    return { result: response };
  } catch (e: any) {
    return { error: (e as unknown as SpotifyApi.ErrorObject).message };
  }
}

export async function nowPlaying(): Promise<Response<SpotifyApi.CurrentlyPlayingResponse>> {
  const { spotifyClient: spotifyApi } = getSpotifyClient(); // await authorizeIfNeeded();

  try {
    console.log("try");
    const response = (await spotifyApi
      .getMyCurrentPlayingTrack()
      .then((response: { body: any }) => response.body as SpotifyApi.CurrentlyPlayingResponse)
      .catch((error) => {
        return { error: (error as unknown as SpotifyApi.ErrorObject).message };
      })) as SpotifyApi.CurrentlyPlayingResponse | undefined;
    return { result: response };
  } catch (e: any) {
    console.log("error");
    return { error: (e as unknown as SpotifyApi.ErrorObject).message };
  }
}

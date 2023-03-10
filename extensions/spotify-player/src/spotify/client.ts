import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Response } from "./interfaces";
import { isRunning, playTrack, setShuffling } from "./applescript";
import { getSpotifyClient } from "../helpers/withSpotifyClient";

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
    console.log("playing", uri, context_uri);
    await spotifyApi.play({ uris: uri ? [uri] : undefined, context_uri });
  } catch (error: any) {
    console.log("error playing", error);
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

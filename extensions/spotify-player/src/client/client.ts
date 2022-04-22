import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import SpotifyWebApi from "spotify-web-api-node";
import { Response } from "./interfaces";
import { authorize, oauthClient } from "./oauth";

const debugMode = false;

export const spotifyApi = new SpotifyWebApi();

async function authorizeIfNeeded(): Promise<void> {
  try {
    await authorize();
  } catch (error) {
    console.error("authorization error:", error);
    showToast({ style: Toast.Style.Failure, title: String(error) });
    return;
  }

  const accessToken = (await oauthClient.getTokens())?.accessToken;
  if (accessToken) {
    spotifyApi.setAccessToken(accessToken);
  } else {
    showToast({ style: Toast.Style.Failure, title: "Invalid accessToken" });
  }
}

export async function currentPlayingTrack(): Promise<SpotifyApi.CurrentlyPlayingResponse | undefined> {
  await authorizeIfNeeded();
  try {
    return await spotifyApi
      .getMyCurrentPlayingTrack()
      .then((response: { body: any }) => response.body as SpotifyApi.CurrentlyPlayingResponse);
  } catch (e: any) {
    showToast(Toast.Style.Failure, e);
  }
}

export async function likeCurrentlyPlayingTrack(): Promise<Response<SpotifyApi.CurrentlyPlayingResponse> | undefined> {
  await authorizeIfNeeded();
  try {
    const track = await currentPlayingTrack();
    if (track && track.item?.id) {
      try {
        const response = await spotifyApi.addToMySavedTracks([track.item?.id]);
        if (response) {
          return { result: track };
        }
      } catch (e: any) {
        return { error: e };
      }
    } else {
      return { error: "Playing song not found" };
    }
  } catch (e: any) {
    return { error: e };
  }
}

export function getArtistAlbums(artistId: string | undefined): Response<SpotifyApi.ArtistsAlbumsResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.ArtistsAlbumsResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    authorizeIfNeeded();

    async function fetchData() {
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
              setResponse((oldState) => ({ ...oldState, error: error.toString() }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: e.toString() }));
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

export function useArtistsSearch(query: string | undefined): Response<SpotifyApi.ArtistSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.ArtistSearchResponse>>({ isLoading: false });
  let cancel = false;

  useEffect(() => {
    authorizeIfNeeded();

    async function fetchData() {
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
              setResponse((oldState) => ({ ...oldState, error: error.toString() }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: e.toString() }));
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
    authorizeIfNeeded();

    async function fetchData() {
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
              setResponse((oldState) => ({ ...oldState, error: error.toString() }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: e.toString() }));
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

export function useTrackSearch(query: string | undefined): Response<SpotifyApi.TrackSearchResponse> {
  const [response, setResponse] = useState<Response<SpotifyApi.TrackSearchResponse>>({ isLoading: false });

  let cancel = false;

  useEffect(() => {
    authorizeIfNeeded();

    async function fetchData() {
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
              setResponse((oldState) => ({ ...oldState, error: error.toString() }));
            })) ?? undefined;

        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, result: response }));
        }
      } catch (e: any) {
        if (!cancel) {
          setResponse((oldState) => ({ ...oldState, error: e.toString() }));
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

function debugLog(...params: unknown[]): void {
  if (!debugMode) return;
  const logParams: unknown[] = params.map((val) => {
    try {
      return JSON.stringify(val);
    } catch (error) {
      return `Could not stringify debug log: ${error}`;
    }
  });
  console.log(...logParams);
}

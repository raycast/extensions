import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const clientId = "7bbb789c01ff44ed842907b7a80c404f";

const scope = [
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-collaborative",
  "playlist-read-private",
  "user-follow-read",
  "user-library-modify",
  "user-library-read",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-private",
  "user-top-read",
].join(" ");

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Spotify",
  providerIcon: "spotify-icon.svg",
  description: "Connect your Spotify account",
  providerId: "spotify",
});

export const provider = new OAuthService({
  client: oauthClient,
  clientId: clientId,
  scope: scope,
  authorizeUrl: "https://accounts.spotify.com/authorize/",
  tokenUrl: "https://accounts.spotify.com/api/token",
  refreshTokenUrl: "https://accounts.spotify.com/api/token",
  bodyEncoding: "url-encoded",
});

// Enhanced error detection for token expiration
export const isTokenExpired = (error: unknown): boolean => {
  const errorObj = error as { status?: number; message?: string };
  return !!(
    errorObj?.status === 401 ||
    errorObj?.message?.includes("token") ||
    errorObj?.message?.includes("unauthorized") ||
    errorObj?.message?.includes("authentication")
  );
};

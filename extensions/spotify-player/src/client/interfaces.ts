export interface Response<T> {
  result?: T;
  error?: string;
  isLoading?: boolean;
}

export interface AuthResponseCredentials {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export type CurrentlyPlayingTrack = {
  id: string;
  artist: string;
  name: string;
};

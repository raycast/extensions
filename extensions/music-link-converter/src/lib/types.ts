export interface PlatformLinkApiResponse {
  url: string;
  nativeAppUriDesktop: string | null;
}

export interface PlatformLinksApiResponse {
  amazonMusic: PlatformLinkApiResponse | null;
  amazonStore: PlatformLinkApiResponse | null;
  anghami: PlatformLinkApiResponse | null;
  deezer: PlatformLinkApiResponse | null;
  appleMusic: PlatformLinkApiResponse | null;
  itunes: PlatformLinkApiResponse | null;
  soundcloud: PlatformLinkApiResponse | null;
  tidal: PlatformLinkApiResponse | null;
  yandex: PlatformLinkApiResponse | null;
  youtube: PlatformLinkApiResponse | null;
  youtubeMusic: PlatformLinkApiResponse | null;
  spotify: PlatformLinkApiResponse | null;
}

export interface SongLinkApiResponse {
  linksByPlatform?: PlatformLinksApiResponse;
}

export interface SongLink {
  label: string;
  link: PlatformLinkApiResponse;
}

export interface ProviderConfig {
  key: keyof PlatformLinksApiResponse;
  label: string;
  urlPatterns: string[];
  enabled: boolean;
}

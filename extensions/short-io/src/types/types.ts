export interface SimpleDomain {
  id: number;
  hostname: string;
}
export interface Domain {
  id: number;
  TeamId: null;
  hostname: string;
  title: null;
  segmentKey: null;
  linkType: string;
  state: string;
  redirect404: null;
  hideReferer: boolean;
  hideVisitorIp: boolean;
  caseSensitive: boolean;
  exportEnabled: boolean;
  cloaking: boolean;
  incrementCounter: string;
  setupType: string;
  httpsLinks: null;
  supportDeprecatedLinkId: boolean;
  clientStorage: null;
  integrationGA: null;
  integrationFB: null;
  integrationAdroll: null;
  integrationGTM: null;
  webhookURL: null;
  httpsLevel: string;
  robots: string;
  provider: null;
  purgeExpiredLinks: boolean;
  lastPurgeDate: null;
  createdAt: string;
  updatedAt: string;
  unicodeHostname: string;
  isFavorite: boolean;
}

export interface ShortLink {
  DomainId: number;
  OwnerId: number;
  androidURL: null;
  archived: boolean;
  clicksLimit: null;
  cloaking: null;
  createdAt: string;
  duplicate: boolean;
  expiredURL: null;
  expiresAt: null;
  icon: null;
  idString: string;
  integrationAdroll: null;
  integrationFB: null;
  integrationGA: null;
  integrationGTM: null;
  iphoneURL: null;
  originalURL: string;
  path: string;
  redirectType: null;
  secureShortURL: string;
  shortURL: string;
  source: string;
  splitPercent: null;
  splitURL: null;
  title: null | string;
  updatedAt: string;
}

export interface ListLinksResponse {
  links: ShortLink[];
  count: number;
}

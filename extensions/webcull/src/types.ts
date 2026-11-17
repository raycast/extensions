export type WebCullBookmark = {
  accountId: string;
  id: string;
  title: string;
  url: string;
  parentStackId: string;
  parentStackPath: string;
  webcullUrl: string;
  tags?: string[];
};

export type WebCullStack = {
  id: string;
  title: string;
  path: string;
};

export type WebCullCapabilityState = {
  accountId?: string;
  bookmarksSearch: boolean;
  bookmarkWrite: boolean;
  e2eeEnabled: boolean;
  localE2eeKeyAvailable: boolean;
  needsAuth?: boolean;
  reason?: string;
  user?: WebCullUser | null;
};

export type WebCullSavePayload = {
  accountId: string;
  parentStackId: string;
  url: string;
  title: string;
};

export type WebCullUser = {
  id: number;
  hash?: string;
  name?: string;
  email?: string;
  icon?: string;
  plan?: string;
};

export type WebCullAuthState = {
  connected: boolean;
  token?: string;
  expires?: number;
  scopes?: string[];
  user?: WebCullUser | null;
  accountId?: string;
};

export type WebCullAuthTokenResponse = {
  success?: string;
  pending?: string;
  failure?: string;
  error?: string;
  token?: string;
  expires?: number;
  scopes?: string[];
  user?: WebCullUser;
};

export type WebCullSavedAccount = {
  accountId: string;
  token: string;
  expires: number;
  scopes: string[];
  user: WebCullUser | null;
  connectedAt: number;
};

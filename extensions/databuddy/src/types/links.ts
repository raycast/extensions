export interface Link {
  id: string;
  slug: string;
  name: string;
  targetUrl: string;
  expiresAt?: string | null;
  expiredRedirectUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogVideoUrl?: string | null;
  iosUrl?: string | null;
  androidUrl?: string | null;
  externalId?: string | null;
  createdAt?: string;
}

export interface LinkCreateInput {
  name: string;
  targetUrl: string;
  slug?: string;
  expiresAt?: string | null;
  expiredRedirectUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogVideoUrl?: string | null;
  iosUrl?: string | null;
  androidUrl?: string | null;
  externalId?: string | null;
}

export interface LinkUpdateInput {
  name?: string;
  targetUrl?: string;
  slug?: string;
  expiresAt?: string | null;
  expiredRedirectUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogVideoUrl?: string | null;
  iosUrl?: string | null;
  androidUrl?: string | null;
  externalId?: string | null;
}

export interface LinkClickSummary {
  total_clicks: number;
}

export interface LinkClicksByDay {
  date: string;
  clicks: number;
}

export interface LinkReferrerEntry {
  name: string;
  domain: string;
  clicks: number;
}

export interface LinkCountryEntry {
  name: string;
  country_code: string;
  clicks: number;
}

export interface LinkDeviceEntry {
  name: string;
  clicks: number;
}

export interface LinkBrowserEntry {
  name: string;
  clicks: number;
}

export interface BrandedLink {
  id: string;
  title: string;
  slashtag: string;
  destination: string;
  shortUrl: string;
  https: boolean;
  [key: string]: unknown;
}

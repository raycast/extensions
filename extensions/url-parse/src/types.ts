export interface Detail {
  href: string;
  protocol: string;
  hostname: string;
  port: string;
  origin: string;
  hash?: string;
  path?: string;
  queries?: Record<string, string | null | undefined>;
}

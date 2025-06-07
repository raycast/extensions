export interface ParseResult {
  href?: string;
  protocol?: string;
  hostname?: string;
  port?: string;
  origin?: string;
  hash?: string;
  path?: string;
  query?: Record<string, string | null | undefined>;
  alias?: string;
}

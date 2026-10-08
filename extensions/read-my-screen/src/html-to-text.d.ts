declare module "html-to-text" {
  export function convert(html: string, options?: Record<string, unknown>): string;
}

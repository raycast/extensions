declare module "pac-resolver" {
  export type FindProxyForURL = (url: string | URL, host?: string) => Promise<string>;
  export function createPacResolver(qjs: unknown, pacScript: string | Buffer): FindProxyForURL;
}

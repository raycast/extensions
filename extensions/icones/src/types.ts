export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Iconify {
    export type Icons = string[];

    export interface IconifyResponse {
      icons: string[];
    }
  }
}

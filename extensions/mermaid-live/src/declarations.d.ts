declare module "pako" {
  export function deflate(data: string | Uint8Array): Uint8Array;
}

declare module "thirty-two" {
  export function encode(data: Buffer | string): Buffer;
  export function decode(data: string): Buffer;
}

declare module "argon2-wasm" {
  export interface HashOptions {
    pass: Buffer | Uint8Array;
    salt: Buffer | Uint8Array;
    time: number;
    mem: number;
    hashLen: number;
    parallelism: number;
    type: number;
  }

  export interface HashResult {
    hash: Uint8Array;
    hashHex: string;
  }

  export function hash(options: HashOptions): Promise<HashResult>;
}

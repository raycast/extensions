declare module "tweetnacl-sealedbox-js" {
  export function seal(message: Uint8Array | Buffer, publicKey: Uint8Array | Buffer): Uint8Array;
  export function open(
    ciphertext: Uint8Array | Buffer,
    publicKey: Uint8Array | Buffer,
    secretKey: Uint8Array | Buffer,
  ): Uint8Array | null;
}

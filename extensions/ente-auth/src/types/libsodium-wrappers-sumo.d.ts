declare module "libsodium-wrappers-sumo" {
  // Define interfaces for libsodium internal state objects
  interface SecretStreamState {
    readonly _state: Uint8Array;
  }

  interface SodiumStatic {
    ready: Promise<void>;

    // Constants
    crypto_secretbox_NONCEBYTES: number;
    crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
    base64_variants: {
      ORIGINAL: number;
      URLSAFE: number;
    };

    // Utility functions
    randombytes_buf(size: number): Uint8Array;
    to_base64(data: Uint8Array, variant?: number): string;
    from_base64(data: string, variant?: number): Uint8Array;

    // Encryption/Decryption
    crypto_secretbox_easy(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
    crypto_secretbox_open_easy(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null;

    // Sealed box functions
    crypto_box_seal_open(ciphertext: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array): Uint8Array | null;

    // Key derivation
    crypto_kdf_derive_from_key(subkeyLen: number, subkeyId: number, ctx: string, key: Uint8Array): Uint8Array;

    // Stream encryption
    crypto_secretstream_xchacha20poly1305_init_pull(header: Uint8Array, key: Uint8Array): SecretStreamState;
    crypto_secretstream_xchacha20poly1305_pull(
      state: SecretStreamState,
      ciphertext: Uint8Array,
      ad: Uint8Array | null,
    ): { message: Uint8Array } | null;

    // Key generation
    crypto_aead_xchacha20poly1305_ietf_keygen(): Uint8Array;
  }

  const sodium: SodiumStatic;
  export default sodium;
}

import forge from "node-forge";

export interface RsaKeyPair {
  publicKey: string;
  privateKey: string;
}

export function generateRsaKeyPair(): RsaKeyPair {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });

  const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
  const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);

  return { publicKey, privateKey };
}

export function signRequest(privateKeyPem: string, data: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(data, "utf8");

  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

export function verifySignature(publicKeyPem: string, data: string, signatureBase64: string): boolean {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const md = forge.md.sha256.create();
    md.update(data, "utf8");

    const signature = forge.util.decode64(signatureBase64);
    return publicKey.verify(md.digest().bytes(), signature);
  } catch {
    return false;
  }
}

export function createRequestSignature(privateKeyPem: string, body: string): string {
  // bunq API requires signing ONLY the request body, not headers or URLs
  // See: https://doc.bunq.com/basics/signing
  return signRequest(privateKeyPem, body);
}

/**
 * Verifies a bunq server response signature.
 *
 * @param serverPublicKeyPem - The server's public key in PEM format (stored during installation)
 * @param responseBody - The raw response body as a string
 * @param signatureBase64 - The X-Bunq-Server-Signature header value
 * @returns true if the signature is valid, false otherwise
 */
export function verifyResponseSignature(
  serverPublicKeyPem: string,
  responseBody: string,
  signatureBase64: string,
): boolean {
  return verifySignature(serverPublicKeyPem, responseBody, signatureBase64);
}

/**
 * Creates a SHA-256 hash of the input string.
 * Used for creating secure fingerprints without revealing the original value.
 *
 * @param input - The string to hash
 * @returns The hex-encoded SHA-256 hash
 */
export function sha256Hash(input: string): string {
  const md = forge.md.sha256.create();
  md.update(input, "utf8");
  return md.digest().toHex();
}

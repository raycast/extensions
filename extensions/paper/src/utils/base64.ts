function base64ToBytes(base64: string) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0) as number);
}

function bytesToBase64(bytes: unknown) {
  const binString = String.fromCodePoint(...(bytes as number[]));
  return btoa(binString);
}

export function encode(message: string) {
  return bytesToBase64(new TextEncoder().encode(message));
}

export function decode(message: string) {
  return new TextDecoder().decode(base64ToBytes(message));
}

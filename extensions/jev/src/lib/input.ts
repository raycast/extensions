/** Detect common credential formats without retaining or logging their contents. */
export function containsCredential(text: string) {
  return /\bapikey_[A-Za-z0-9_-]{20,}|\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
    text,
  );
}

export function assertSafeInput(payload: string, apiKey: string) {
  if (containsCredential(payload) || (apiKey.length >= 12 && payload.includes(apiKey))) {
    throw new Error(
      "This input appears to contain an API key or private key. Remove the credential before sending it.",
    );
  }
}

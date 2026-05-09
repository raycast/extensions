import { webcrypto } from "node:crypto";

export function ensureNodeWebCrypto(): void {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
      writable: false,
    });
  }
}

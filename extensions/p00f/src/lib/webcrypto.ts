// @p00f/core is written against the ambient Web Crypto global so the same code
// runs unchanged in browsers, in workerd, and under Node (ADR-0010, one core
// many shells). Raycast's extension host does not guarantee that global: it
// runs each command in a worker_threads Worker whose scope has been observed on
// multiple machines to have no binding for `crypto`, so the first encrypt threw
// "ReferenceError: crypto is not defined" before any request left the machine.
//
// Node always exposes the same implementation as `webcrypto` from node:crypto,
// so the shell installs it on globalThis before core touches it. Core reads
// `crypto` lazily inside its functions, never at module scope, so importing
// this module first in every entry point is sufficient.
import { webcrypto } from "node:crypto";

/**
 * True when `candidate` cannot serve as Web Crypto for core's needs: core uses
 * `crypto.getRandomValues` for IVs and salts, and `crypto.subtle` for HKDF and
 * AES-GCM. A partial global (present but missing `subtle`) is as unusable as an
 * absent one, so both are treated the same.
 */
export function needsWebCryptoPolyfill(candidate: unknown): boolean {
  if (typeof candidate !== "object" || candidate === null) return true;
  const c = candidate as Partial<Crypto>;
  return typeof c.getRandomValues !== "function" || !c.subtle;
}

/**
 * Guarantee a usable Web Crypto on `target`. Idempotent, and a no-op on hosts
 * that already provide a working global, so this never shadows a real
 * implementation with the Node one.
 */
export function ensureWebCrypto(target: object = globalThis): void {
  const holder = target as Record<string, unknown>;
  if (!needsWebCryptoPolyfill(holder.crypto)) return;
  // defineProperty rather than assignment: on some hosts `crypto` is an
  // accessor with no setter, where a plain assignment silently no-ops (or
  // throws under strict mode) and leaves the broken value in place.
  Object.defineProperty(holder, "crypto", {
    value: webcrypto,
    configurable: true,
    enumerable: false,
    writable: false,
  });
}

ensureWebCrypto();

/* tslint:disable */
/* eslint-disable */

/**
 * Runs one request and returns a framed response buffer (see the module
 * docs). Bad input, a limit overrun or a stage failure comes back as an
 * error frame, never a trap.
 */
export function call(op: number, request: string): Uint8Array;

/**
 * The lazy packs a request needs that are not registered yet, as a JSON
 * array. A host calls this before rendering, fetches the result, and
 * registers every file in each pack.
 */
export function missing_packs(request: string): string;

/**
 * The lazy packs a request needs, as a JSON array.
 */
export function packs_for(request: string): string;

/**
 * Registers one font file from a lazy pack.
 *
 * The host slices the pack's blob into its files (the offsets are in
 * `packs.json`) and calls this once per file. The bytes are copied into
 * wasm memory and kept for the rest of the module's life, exactly like an
 * embedded face. The next render rebuilds the face table.
 */
export function register_font(file: string, data: Uint8Array | number[]): void;

/**
 * `xeet-resolve`, for a JS host.
 *
 * `input` is text, an x.com post URL or post JSON; `options` is the JSON
 * form of [`xeet_resolve::Options`]; `host` is the object `js.rs` documents
 * (a `fetch` function is the only required member). Resolves with the JSON
 * form of `Resolved`, rejects with `{code, status, message, fields?}`.
 */
export function resolve(input: string, options: string, host: any): Promise<any>;

/**
 * `POST /resolve-links`, for a JS host: one URL in, one link out.
 *
 * Rejects with the same `{code, status, message}` object as [`resolve`].
 */
export function resolve_links(url: string, options: string, host: any): Promise<any>;

/**
 * The upstream app version this build embeds, so a caller can record what
 * produced a render (PLAN.md §11: every preview says how fresh it is).
 */
export function upstream_version(): string;

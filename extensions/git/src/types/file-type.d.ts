/**
 * Ambient types for `file-type`.
 * The package is ESM-only (`exports` map) and does not resolve under the extension's
 * default TypeScript `moduleResolution`, while Raycast's bundler still loads it at runtime.
 *
 * Prefer `fileTypeFromBuffer` over `fileTypeFromFile`: the latter dynamically imports
 * `strtok3` at runtime, which is unavailable in Raycast's installed extension bundle.
 */
declare module "file-type" {
  export type FileTypeResult = {
    ext: string;
    mime: string;
  };

  export function fileTypeFromBuffer(buffer: Uint8Array | ArrayBuffer): Promise<FileTypeResult | undefined>;
}

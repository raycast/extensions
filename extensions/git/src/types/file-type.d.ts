/**
 * Ambient types for `file-type`.
 * The package is ESM-only (`exports` map) and does not resolve under the extension's
 * default TypeScript `moduleResolution`, while Raycast's bundler still loads it at runtime.
 */
declare module "file-type" {
  export type FileTypeResult = {
    ext: string;
    mime: string;
  };

  export function fileTypeFromFile(filePath: string): Promise<FileTypeResult | undefined>;
}

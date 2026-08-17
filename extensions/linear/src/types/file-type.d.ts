declare module "file-type" {
  export type FileTypeResult = {
    readonly ext: string;
    readonly mime: string;
  };

  export function fileTypeFromBuffer(buffer: Uint8Array): Promise<FileTypeResult | undefined>;
}

declare module "file-type" {
  export type FileTypeResult = {
    readonly ext: string;
    readonly mime: string;
  };

  export function fileTypeFromFile(filePath: string): Promise<FileTypeResult | undefined>;
}

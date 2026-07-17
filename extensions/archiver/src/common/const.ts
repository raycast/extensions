import { Color } from "@raycast/api";
import { FormatMetadata } from "./types";
import { compressBy7za, extractBy7za } from "./utils";

export enum CompressFormat {
  PREVIOUS = "PREVIOUS",
  "7Z" = "7Z",
  ZIP = "ZIP",
  TAR = "TAR",
  GZIP = "GZIP",
}

export enum ExtractFormat {
  "7Z" = "7Z",
  ZIP = "ZIP",
  TAR = "TAR",
  GZIP = "GZIP",
}

export const COMPRESS_FORMAT_METADATA = new Map<CompressFormat, FormatMetadata>([
  [CompressFormat["7Z"], { ext: ".7z", color: Color.Orange }],
  [CompressFormat.ZIP, { ext: ".zip", color: Color.Red }],
  [CompressFormat.TAR, { ext: ".tar", color: Color.Yellow }],
  [CompressFormat.GZIP, { ext: ".tar.gz", color: Color.Green }],
]);

export const COMPRESS_HANDLES = new Map<
  CompressFormat,
  (files: string[], format: CompressFormat, password?: string) => Promise<string>
>([
  [CompressFormat["7Z"], compressBy7za],
  [CompressFormat.ZIP, compressBy7za],
  [CompressFormat.TAR, compressBy7za],
  [CompressFormat.GZIP, compressBy7za],
]);

export const EXTRACT_FORMAT_METADATA = new Map<ExtractFormat, FormatMetadata>([
  [ExtractFormat["7Z"], { ext: ".7z", color: Color.Orange }],
  [ExtractFormat.ZIP, { ext: ".zip", color: Color.Red }],
  [ExtractFormat.TAR, { ext: ".tar", color: Color.Yellow }],
  [ExtractFormat.GZIP, { ext: ".gz", color: Color.Green }],
]);

export const EXTRACT_HANDLES = new Map<
  ExtractFormat,
  (file: string, format: ExtractFormat, password?: string) => Promise<string>
>([
  [ExtractFormat["7Z"], extractBy7za],
  [ExtractFormat.ZIP, extractBy7za],
  [ExtractFormat.TAR, extractBy7za],
  [ExtractFormat.GZIP, extractBy7za],
]);

export const PRE_PWD_CHECK_THRESHOLD = 50;

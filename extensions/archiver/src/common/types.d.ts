import { Color } from "@raycast/api";

interface ICompressPreferences {
  defaultCompressSelected: boolean;
  deleteAfterCompression: boolean;
  locationSaveCompressed: string;
  defaultCompressionFormat: CompressFormat;
  useOriginalNameWhenSingle: boolean;
  useParentFolderNameWhenMultiple: boolean;
}

interface IExtractPreferences {
  defaultExtractSelected: boolean;
  deleteAfterExtraction: boolean;
  locationSaveExtracted: string;
}

interface IFileInfo {
  path: string;
  format?: CompressFormat | ExtractFormat;
}

interface FormatMetadata {
  ext: string;
  color: Color;
}

interface ZipEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  path: string;
  lastModDate: Date;
}

interface ZipFile {
  fileName: string;
  fullPath: string;
  entries: ZipEntry[];
  currentDir: string;
}

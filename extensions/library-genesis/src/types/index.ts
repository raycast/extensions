export interface BookEntry {
  title: string;
  author: string;
  year?: string;
  infoUrl: string;
  downloadUrl: string;
  coverUrl: string;
  pages?: string;
  language: string;
  publisher?: string;
  edition?: string;
  commentary?: string;
  extension: string;
  fileSize?: string;
  md5: string;
  timeAdded?: string;
  timeLastModified?: string;
  id?: string;
  isbn?: string;
  series?: string;
  periodical?: string;
}

export interface LibgenSearchParams {
  req: string;
}

export enum LibgenDownloadGateway {
  Default = 0,
  Cloudflare = 1,
  "IPFS.io" = 2,
  Infura = 3,
  Pinata = 4,
}
export enum BookAction {
  "OpenDownloadPage" = 0,
  "OpenBookInfo" = 1,
  "DownloadBook" = 2,
}

export enum SearchPriority {
  "None" = 0,
  "PreferredLanguages" = 1,
  "PreferredFileFormats" = 2,
}
export interface LibgenPreferences {
  primaryAction: BookAction;
  copySearchContentFromClipboard: boolean;
  preferredLibgenMirror: string;
  downloadGateway: LibgenDownloadGateway;
  downloadPath: string;
  allowIgnoreHTTPSErrors: boolean;
  alwaysAskWhereToSave: boolean;
  searchPriority: SearchPriority;
  preferredLanguages: string;
  preferredFormats: string;
}

export enum SearchType {
  "All" = -1,
  "Fiction" = 0,
  "NonFiction" = 1,
}

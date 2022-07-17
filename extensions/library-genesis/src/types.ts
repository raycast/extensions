export interface BookEntry {
  title: string;
  author: string;
  year?: string;
  url: string;
  coverUrl: string;
  pages?: string;
  language?: string;
  publisher?: string;
  edition?: string;
  commentary?: string;
  extension?: string;
  fileSize?: string;
  md5?: string;
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

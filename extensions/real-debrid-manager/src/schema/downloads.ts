export type DownloadFileData = {
  id: string;
  filename: string;
  mimeType: string;
  filesize: number;
  link: string;
  host: string;
  chunks: number;
  download: string;
  generated: string;
  type?: string; // Optional field
};

export type DownloadsData = DownloadFileData[];

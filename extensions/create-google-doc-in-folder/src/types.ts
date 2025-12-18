export interface GoogleFolder {
  id: string;
  name: string;
  mimeType: string;
}

export interface GoogleDoc {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveFilesResponse {
  files: GoogleFolder[];
  nextPageToken?: string;
}

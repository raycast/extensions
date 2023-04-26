export interface LinkdingBookmark {
  id: number;
  url: string;
  title: string;
  description: string;
  website_title: string;
  website_description: string;
}

export interface LinkdingResponse {
  count: number;
  results: LinkdingBookmark[];
}

export interface LinkdingServer {
  serverUrl: string;
  apiKey: string;
  ignoreSSL: boolean;
}

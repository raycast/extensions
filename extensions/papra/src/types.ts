export type Organization = {
    id: string;
    name: string;
};
export type Document = {
  id: string;
  createdAt: string;
  originalSize: number
  name: string;
  mimeType: string
};
export type SearchResult = {
  id: string;
  created_at: string;
  original_size: number
  name: string;
  mime_type: string
}
export type Tag= {
  id: string;
  createdAt: string;
  name: string;
  "color": string
  "description": string
    "documentsCount": number
};

export type ErrorResult = {
  error: {
    message: string;
    code: string;
    details?: Array<{
      path: string
      message: string
    }>;
  };
};

export interface ShorteningService {
  id: string;
  name: string;
  endpoint: string;
  icon: string;
  requiresApiKey: boolean;
  apiKeyPreferenceName?: string;
}

export interface ShortenResult {
  originalUrl: string;
  shortUrl: string;
  service: string;
  createdAt: string;
}

export interface ShortenError {
  service: string;
  message: string;
  code?: number;
}

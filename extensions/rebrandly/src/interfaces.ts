export interface BrandedLink {
  id: string;
  title: string;
  slashtag: string;
  destination: string;
  shortUrl: string;
  https: boolean;
  favourite: boolean;
  clicks: number;
  createdAt: string;
}

export interface ErrorResponse {
  property?: string;
  message: string;
  code: string;
  source?: string;
  errors?: Array<{
    code: string;
    property: string;
    message: string;
  }>;
}

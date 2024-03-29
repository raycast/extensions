export interface RedirectionStep {
  url: string;
  statusCode: number;
  statusName: string;
  faviconUrl?: string;
  errorMessage?: string;
}

export interface RedirectionStep {
  url: string;
  statusCode: number;
  statusName: string;
  errorMessage?: string;
}

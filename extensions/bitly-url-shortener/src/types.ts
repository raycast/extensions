export interface Bitlink {
  created_at: string;
  id: string;
  link: string;
  long_url: string;
  title: string;
  archived: boolean;
  created_by: string;
  client_id: string;
}
export interface ErrorResult {
  message: string;
  description?: string;
  resource?: string;
  errors?: {
    field: string;
    error_code: string;
    message: string;
  }[];
}

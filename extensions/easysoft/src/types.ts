export interface Subject {
  id: string;
  title: string;
  subTitle?: string;
  description?: string;
  type: string;
  endDate?: string;
  publishDate?: string;
  resultReportStatus?: string;
  [key: string]: unknown;
}

export interface AssessmentData {
  [key: string]: unknown;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface CSRFResponse {
  csrfToken: string;
}

export interface NewsAttachment {
  name: string;
  url: string;
  size?: string;
}

export interface NewsMetadata {
  from?: string;
  to?: string;
  published?: string;
  showTo?: string;
  toTeacher?: boolean;
  toStudent?: boolean;
  toParent?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  preview: string;
  date: string;
  content: string;
  metadata: NewsMetadata;
  attachments: NewsAttachment[];
}

export interface NewsHtmlResponse {
  html: string;
}

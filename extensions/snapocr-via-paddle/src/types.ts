import { getPreferenceValues } from "@raycast/api";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export type OCRFileType = 0 | 1;

export interface PaddleOCRRequest {
  file: string;
  fileType: OCRFileType;
  useDocOrientationClassify?: boolean;
  useDocUnwarping?: boolean;
  useChartRecognition?: boolean;
}

export interface LayoutParsingResult {
  markdown?: {
    text?: string;
    images?: Record<string, string>;
  };
  isStart?: boolean;
  isEnd?: boolean;
  pageIndex?: number;
}

export interface PaddleOCRResponseResult {
  layoutParsingResults: LayoutParsingResult[];
}

export interface PaddleOCRResponse {
  logId: string;
  errorCode: number;
  errorMsg: string;
  result: PaddleOCRResponseResult;
}

export interface OCRPage {
  index: number;
  text: string;
  images: Record<string, string>;
  raw: LayoutParsingResult;
}

export interface OCRResult {
  text: string;
  pages: OCRPage[];
  raw: PaddleOCRResponse;
}

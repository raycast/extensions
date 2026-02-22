import { getPreferenceValues } from "@raycast/api";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export interface PaddleOCRRequest {
  file: string;
  fileType: number;
  useDocOrientationClassify?: boolean;
  useDocUnwarping?: boolean;
  useChartRecognition?: boolean;
}

export interface LayoutParsingResult {
  markdown: {
    text: string;
    images?: Record<string, string>;
  };
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

export interface OCRResult {
  text: string;
  raw: PaddleOCRResponse;
}

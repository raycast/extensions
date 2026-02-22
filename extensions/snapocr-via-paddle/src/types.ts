import { getPreferenceValues } from "@raycast/api";

export interface PaddleOCRPreferences {
  accessToken: string;
  apiUrl: string;
  useDocOrientationClassify: boolean;
  useDocUnwarping: boolean;
  useChartRecognition: boolean;
}

export function getPreferences(): PaddleOCRPreferences {
  return getPreferenceValues<PaddleOCRPreferences>();
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

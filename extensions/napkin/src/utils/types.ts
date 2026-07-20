export interface CreateVisualRequest {
  content: string;
  format: "png" | "svg" | "ppt";
  style_id?: string;
  context?: string;
  language?: string;
  transparent_background?: boolean;
  color_mode?: "light" | "dark" | "both";
  visual_query?: string;
  text_extraction_mode?: "auto" | "rewrite" | "preserve";
  sort_strategy?: "relevance" | "variation" | "random";
}

export interface GeneratedFile {
  url: string;
  visual_id: string;
  style_id: string;
  width: number;
  height: number;
}

export interface VisualStatusResponse {
  id: string;
  status: "pending" | "completed" | "failed";
  generated_files?: GeneratedFile[];
  error?: {
    message: string;
    code?: string;
  };
  warnings?: { message: string; code: string }[];
}

export interface ApiError {
  error: string;
  message: string;
  retry_after?: number;
}

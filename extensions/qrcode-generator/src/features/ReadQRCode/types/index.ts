export type ImageSource = "file" | "screenshot" | "clipboard";

export interface DecodeAction {
  (filePath: string, source: ImageSource): Promise<void>;
}

export interface DecodeResult {
  text: string;
  imagePath: string;
}

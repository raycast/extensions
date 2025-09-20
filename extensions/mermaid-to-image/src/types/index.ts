export interface Preferences {
  outputFormat: "png" | "svg";
  theme: "default" | "forest" | "dark" | "neutral";
  savePath?: string;
  customMmdcPath?: string;
  generationTimeout?: number;
}

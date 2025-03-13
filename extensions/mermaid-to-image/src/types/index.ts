export interface Preferences {
  outputFormat: "png" | "svg";
  theme: string;
  savePath?: string;
  customMmdcPath?: string;
  generationTimeout?: string;
}

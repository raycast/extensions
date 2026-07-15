import type { RenderEngine } from "../renderers/types";

export interface Preferences {
  outputFormat: "png" | "svg";
  renderEngine: RenderEngine;
  beautifulTheme?: string;
  customBeautifulMermaidPath?: string;
  theme: "default" | "forest" | "dark" | "neutral";
  savePath?: string;
  customMmdcPath?: string;
  generationTimeout?: number;
  scale?: number | string;
}

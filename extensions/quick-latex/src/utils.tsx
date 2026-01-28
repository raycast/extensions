import { Clipboard, environment, showHUD } from "@raycast/api";
import fs from "fs";
import { resolve } from "path";

export enum ExportType {
  PNG = "png",
  GIF = "gif",
  SVG = "svg",
  PDF = "pdf",
  EMF = "emf",
}

enum DownloadFormat {
  IMAGE = "image",
  JSON = "json",
  JS = "javascript",
  DOWNLOAD = "download",
}

export const DOWNLOAD_DIR = resolve(environment.supportPath, "download");

export const BASE_URL = "https://latex.codecogs.com/";

export const DISPLAY_LATEX_URL = BASE_URL + "png.image?" + encodeURIComponent("\\dpi{512}");
//const latexUrlDark = "https://latex.codecogs.com/png.image?" + encodeURIComponent("\\dpi{512}\\bg{white}");

export const DEFAULT_ICON = {
  source: {
    light: DISPLAY_LATEX_URL + encodeURIComponent("LaTeX"),
    dark: DISPLAY_LATEX_URL + encodeURIComponent("{\\color{White} LaTeX}"),
  },
};

export interface QuickLatexPreferences {
  svgWidth: string;
  svgHeight: string;
  svgViewbox: string;
  background: string;
}

export interface QuickLatexArguments {
  latex: string | undefined;
}

export async function toClipboard(file: string) {
  // copies a file (path) as file to clipboard
  try {
    const fileContent: Clipboard.Content = { file };
    await Clipboard.copy(fileContent);
  } catch (error) {
    showHUD(`Could not copy file '${file}'. Reason: ${error}`);
  }
}

export function makeDonwloadDir() {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
}

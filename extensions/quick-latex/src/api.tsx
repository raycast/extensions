import { getPreferenceValues, showHUD } from "@raycast/api";
import { BASE_URL, DISPLAY_LATEX_URL, DOWNLOAD_DIR, ExportType, QuickLatexPreferences } from "./utils";
import { parse, stringify } from "svgson";
import fetch from "node-fetch";
import fs from "fs";

async function editSVG(text: string) {
  const preferences = getPreferenceValues<QuickLatexPreferences>();
  const svg = await parse(text);
  svg.attributes.width = preferences.svgWidth + "px";
  svg.attributes.height = preferences.svgHeight + "px";
  svg.attributes.viewBox = preferences.svgViewbox;
  return stringify(svg);
}

export async function downloadLatex(exportType: ExportType, searchText: string) {
  // downloads the latex image
  // adjusts width and height of svg
  // saves image to downloadDir
  // returns path to image
  const preferences = getPreferenceValues<QuickLatexPreferences>();
  const latex = searchText == "" ? "LaTeX" : searchText;
  const url =
    BASE_URL +
    exportType +
    ".image?" +
    encodeURIComponent(`\\dpi{512}\\bg{${preferences.background}}`) +
    encodeURIComponent(latex);
  const path = DOWNLOAD_DIR + `/img.${exportType}`;
  const res = await fetch(url);
  if (!res.ok) {
    showHUD("No internet connection. Or something else.");
  } else {
    let image: string | Buffer = "";
    if (exportType == ExportType.SVG) {
      let text = await res.text();
      text = await editSVG(text);
      image = text;
    } else {
      const data = await res.arrayBuffer();
      const buffer = Buffer.from(data);
      image = buffer;
    }

    fs.writeFileSync(path, image);
  }
  return path;
}

export function getDisplayLatex(searchText: string) {
  return {
    source: {
      light: DISPLAY_LATEX_URL + encodeURIComponent(searchText),
      dark: DISPLAY_LATEX_URL + encodeURIComponent(`{\\color{White} ${searchText}}`),
    },
  };
}

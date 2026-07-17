import { getPreferenceValues, showHUD } from "@raycast/api";
import { BASE_URL, DISPLAY_LATEX_URL, DOWNLOAD_DIR, ExportType, QuickLatexPreferences } from "./utils";
import { parse, stringify } from "svgson";
import fetch, { RequestInit } from "node-fetch";
import fs from "fs";

export type PreviewAbortSignal = NonNullable<RequestInit["signal"]>;

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

export async function getPreviewImage(searchText: string, signal?: PreviewAbortSignal) {
  const latex = searchText === "" ? "LaTeX" : searchText;
  const res = await fetch(getPreviewUrl(latex), { signal });

  if (!res.ok) {
    throw new Error("Failed to fetch preview SVG");
  }

  const lightSvg = await res.text();
  const darkSvgNode = await parse(lightSvg);
  darkSvgNode.attributes.fill = "white";
  darkSvgNode.attributes.style = [darkSvgNode.attributes.style, "color:white;fill:white"].filter(Boolean).join(";");
  const darkSvg = stringify(darkSvgNode);

  return {
    source: {
      light: createPreviewCanvas(lightSvg),
      dark: createPreviewCanvas(darkSvg),
    },
  };
}

function getPreviewUrl(latex: string) {
  return BASE_URL + "svg.image?" + encodeURIComponent(latex);
}

function createPreviewCanvas(svg: string) {
  const embeddedSvg = Buffer.from(svg).toString("base64");
  const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="640px" height="280px" viewBox="0 0 640 280">
    <image x="32" y="24" width="576" height="232" preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${embeddedSvg}" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(canvas)}`;
}

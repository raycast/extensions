import { exec } from "child_process";
import { jax, adaptor } from "./mathjax";
import asciiMathToLatex from "asciimath-to-latex";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
const execAsync = promisify(exec);

const directory = os.tmpdir();
export const svgFilename = path.join(directory, `math.svg`);

interface Preferences {
  imageExportWidth: string;
  imageExportHeight: string;
  imageMagickPath: string;
  homebrewPath: string;
}

export async function exportImage(string: string, useAsciimath: boolean, inline: boolean, format: "png" | "jpg") {
  // Create the SVG string
  const imageFilename = path.join(directory, `math.${format}`);
  const svgString = renderSvg(string, useAsciimath, inline);

  // Create the command to convert SVG to PNG using ImageMagick
  const preferences = getPreferenceValues<Preferences>();
  const magickCommand = `${preferences.imageMagickPath} -density 300 -background ${
    format === "png" ? "none" : "white"
  } -fill "black" - -resize ${preferences.imageExportWidth}x${preferences.imageExportHeight} ${imageFilename}`;
  const pipeline = `export PATH="${preferences.homebrewPath}:$PATH" && echo '${svgString.replace(
    /'/g,
    "'\\''"
  )}' | ${magickCommand}`;
  const command = `bash -c "${pipeline.replace(/"/g, '\\"')}"`;

  // Execute the command
  try {
    const { stderr } = await execAsync(command);
    if (stderr) console.error(`ImageMagick stderr: ${stderr}`);
  } catch (error) {
    console.error("Failed to execute ImageMagick command:", error);
    throw error;
  }
  return imageFilename;
}

export async function exportSvgImage(string: string, useAsciimath: boolean, inline: boolean) {
  const svgString = renderSvg(string, useAsciimath, inline);
  await fs.promises.writeFile(svgFilename, svgString);
  return svgFilename;
}

export function typesetBase64Svg(string: string, useAsciimath: boolean, inline: boolean) {
  const htmlCode = renderSvg(string, useAsciimath, inline);
  const base64 = Buffer.from(htmlCode).toString("base64");
  const imgSrc = `data:image/svg+xml;base64,${base64}`;
  return imgSrc;
}

export function renderSvg(string: string, useAsciimath: boolean, inline: boolean) {
  if (!string) return "";
  const texString = useAsciimath ? asciiMathToLatex(string) : string;
  const node = jax.convert(texString, {
    display: !inline,
  });

  const svg = node.children[0];
  const { viewBox } = svg.attributes;
  const [, , width, height] = viewBox.split(" ").map(parseFloat).map(Math.round);
  svg.attributes.height = `${height}px`;
  svg.attributes.width = `${width}px`;
  const svgCode = adaptor.outerHTML(svg);
  return svgCode;
}

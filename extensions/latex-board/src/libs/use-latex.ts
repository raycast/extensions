import { environment } from "@raycast/api";
import { BASE_URL, IMAGE_TYPE } from "../core/constants";
import { resolve } from "path";
import { homedir } from "os";
import fs from "fs";

/**
 * A hook for rendering and downloading LaTeX images.
 *
 * @returns
 *   - displayLatexURL: Function to generate the URL for displaying LaTeX code as an image.
 *   - downloadLatexImage: Function to download the LaTeX image (currently not implemented).
 */
export const useLatex = () => {
  /**
   * Generate the URL for displaying LaTeX code as an image.
   * @param latex - The LaTeX code to be rendered.
   */
  const displayLatexURL = (latex: string): string => {
    const textColor = environment.appearance === "dark" ? "White" : "Black";

    const encodeLatex = encodeURIComponent(`\\large\\color{${textColor}}${latex}`);

    const url = `${BASE_URL}?${encodeLatex}`;

    return url;
  };

  /**
   * Download the LaTeX as SVG image.
   * @param title - The title for the file name.
   * @param latex - The LaTeX code to download as SVG.
   */
  const downloadLatexImage = async (title: string, latex: string) => {
    const encodeLatex = encodeURIComponent(latex);
    const url = `${BASE_URL}?${encodeLatex}`;

    const res = await fetch(url);
    const svgContent = await res.text();

    const filename = title.replace(/[/\\?%*:|"<>]/g, "-");

    const downloadDir = resolve(homedir(), "Downloads");
    const filePath = resolve(downloadDir, `${filename}.${IMAGE_TYPE}`);
    fs.writeFileSync(filePath, svgContent, "utf-8");
  };

  return { displayLatexURL, downloadLatexImage };
};

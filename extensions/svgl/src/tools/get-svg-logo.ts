import { Clipboard } from "@raycast/api";
import { Svg } from "../type";
import { fetchSvgs, fetchSvg } from "../utils/fetch";

type Input = {
  name: string;
  wordmark?: boolean;
  color?: "light" | "dark";
};

const tool = async ({ name, wordmark, color = "light" }: Input) => {
  const svgs = (await fetchSvgs()) as Svg[];
  const filteredSvgs = svgs.filter((svg) => svg.title.toLowerCase() === name.toLowerCase());

  if (filteredSvgs.length === 0) {
    return `No SVG found for ${name}`;
  }

  const getSvg = async (svg: Svg) => {
    let svgContent: string | undefined;

    if (wordmark) {
      if (!svg.wordmark) {
        return `No wordmark SVG found for ${name}`;
      }
      if (typeof svg.wordmark === "string") {
        svgContent = await fetchSvg(svg.wordmark);
      } else if (color && color in svg.wordmark) {
        svgContent = await fetchSvg(svg.wordmark[color]);
      } else {
        return `No ${color || "specified"} wordmark SVG found for ${name}`;
      }
    } else {
      if (typeof svg.route === "string") {
        svgContent = await fetchSvg(svg.route);
      } else if (color && color in svg.route) {
        svgContent = await fetchSvg(svg.route[color]);
      } else {
        return `No ${color || "specified"} SVG found for ${name}`;
      }
    }

    if (svgContent) {
      await Clipboard.copy(svgContent);
      return `✅ ${name} SVG copied to clipboard!`;
    }

    return `Failed to copy SVG for ${name}.`;
  };

  if (filteredSvgs.length === 1) {
    return await getSvg(filteredSvgs[0]);
  }

  const results = await Promise.all(filteredSvgs.map(getSvg));
  return results;
};

export default tool;

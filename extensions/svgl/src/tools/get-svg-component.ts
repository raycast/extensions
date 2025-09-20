import { Clipboard } from "@raycast/api";
import { Svg } from "../type";
import { fetchSvgs, fetchSvg, fetchAndCopyReactComponent } from "../utils/fetch";
import { generateVueOrSvelteComponentAndCopy, generateAngularComponentAndCopy } from "../utils/component-template";

type Input = {
  name: string;
  color?: "light" | "dark";
  framework?: string;
  lang?: string;
};

const tool = async ({ name, color, framework, lang }: Input) => {
  const svgs = (await fetchSvgs()) as Svg[];
  const filteredSvgs = svgs.filter((svg) => svg.title.toLowerCase() === name.toLowerCase());

  if (filteredSvgs.length === 0) {
    return `No SVG found for ${name}`;
  }

  const getSvgComponent = async (svg: Svg) => {
    let svgUrl: string | undefined;

    if (framework) {
      svgUrl = typeof svg.route === "string" ? svg.route : color ? svg.route[color] : svg.route["light"];

      switch (framework.toLocaleLowerCase()) {
        case "react":
          await fetchAndCopyReactComponent(svgUrl, name, lang === "tsx");
          return `✅ React component for ${name} copied to clipboard!`;

        case "vue":
        case "svelte":
          framework = framework.toLowerCase().charAt(0).toUpperCase() + framework.slice(1);
          await generateVueOrSvelteComponentAndCopy(lang || "", svgUrl, framework as "Vue" | "Svelte");
          return `✅ ${framework} component for ${name} copied to clipboard!`;

        case "angular":
          await generateAngularComponentAndCopy(svgUrl, name);
          return `✅ Angular component for ${name} copied to clipboard!`;

        default:
          return `⚠️ Unsupported framework: ${framework}`;
      }
    }

    if (!svgUrl) {
      return `No ${color || "default"} SVG found for ${name}.`;
    }

    try {
      const svgContent = await fetchSvg(svgUrl);
      await Clipboard.copy(svgContent);
    } catch (error) {
      return `❌ Failed to fetch SVG: ${(error as Error).message}`;
    }
    return `✅ ${name} SVG ${framework} component copied to clipboard!`;
  };

  if (filteredSvgs.length === 1) {
    return await getSvgComponent(filteredSvgs[0]);
  }

  const results = await Promise.all(filteredSvgs.map(getSvgComponent));
  return results.join("\n");
};

export default tool;

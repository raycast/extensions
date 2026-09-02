import { copyAsCSSClasses, copyAsCSSVariables, copyAsJSON, parseColorList } from "../lib/utils";

type Input = {
  colors: string;
  format: string;
};

export default function formatPalette(input: Input): string {
  try {
    const colors = parseColorList(input.colors);
    let output: string;

    switch (input.format) {
      case "json":
        output = copyAsJSON(colors);
        break;
      case "css-classes":
        output = copyAsCSSClasses(colors);
        break;
      case "css-variables":
        output = copyAsCSSVariables(colors);
        break;
      default:
        throw new Error();
    }

    return output;
  } catch {
    throw new Error("Provide valid CSS colors and a supported format: json, css-classes, or css-variables.");
  }
}

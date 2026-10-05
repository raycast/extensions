import {
  getAccurateAvailableStyles,
  getHugeiconsApiKey,
  renderIconCode,
  resolveIconMetaByName,
  resolveToolStyle,
  toAiIconSummary,
  type AiIconCodeFormat,
} from "../lib/hugeicons-ai";

type Input = {
  /**
   * Exact Hugeicons icon name to export.
   */
  name: string;
  /**
   * Output format.
   * Use "jsx" or "react" for React component code.
   */
  format?: AiIconCodeFormat;
  /**
   * Optional style to request before exporting code.
   * Use one of: default, stroke-standard, solid-standard, duotone-standard,
   * stroke-rounded, solid-rounded, duotone-rounded, twotone-rounded, bulk-rounded,
   * solid-sharp, or stroke-sharp.
   */
  style?: string;
  /**
   * Optional CSS color value. Defaults to currentColor for reusable code.
   */
  color?: string;
};

function resolveCodeFormat(format?: AiIconCodeFormat): AiIconCodeFormat {
  const normalizedFormat = format?.trim().toLowerCase();

  switch (normalizedFormat) {
    case "react":
    case "jsx":
    case "vue":
    case "svelte":
    case "svg":
      return normalizedFormat;
    default:
      return "svg";
  }
}

export default async function tool(input: Input) {
  const requestedName = input.name.trim();

  if (!requestedName) {
    return {
      found: false,
      requestedName,
      suggestions: [],
      message: "Provide an exact Hugeicons icon name to export.",
    };
  }

  const apiKey = await getHugeiconsApiKey();
  const format = resolveCodeFormat(input.format);
  const requestedStyle = resolveToolStyle(input.style);
  const abortController = new AbortController();
  const { match, suggestions } = await resolveIconMetaByName({
    name: requestedName,
    apiKey,
    signal: abortController.signal,
  });

  if (!match) {
    return {
      found: false,
      requestedName,
      suggestions: suggestions.map(toAiIconSummary),
      message: "No exact Hugeicons icon matched that name.",
    };
  }

  const availableStyles = await getAccurateAvailableStyles({
    name: match.name,
    apiKey,
    signal: abortController.signal,
  });
  const code = await renderIconCode({
    name: match.name,
    apiKey,
    signal: abortController.signal,
    style: requestedStyle,
    format,
    color: input.color,
  });

  return {
    found: true,
    requestedName,
    icon: {
      ...toAiIconSummary(match),
      availableStyles,
    },
    format: code.format === "react" ? "jsx" : code.format,
    requestedStyle: code.requestedStyle,
    resolvedStyle: code.resolvedStyle,
    color: code.color,
    code: code.code,
    message:
      code.requestedStyle !== code.resolvedStyle
        ? `Requested ${code.requestedStyle} style was unavailable, so the default icon SVG was returned instead.`
        : undefined,
  };
}

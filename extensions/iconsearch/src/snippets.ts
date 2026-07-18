import type { IconCustomization, IconSearchIcon, OutputFormat } from "./types";

const MONOCHROME_LIBRARIES = new Set([
  "ant-design-icons",
  "bootstrap-icons",
  "circum-icons",
  "elusive-icons",
  "feather-icons",
  "heroicons",
  "iconoir",
  "ionicons",
  "lucide-icons",
  "octicons",
  "patternfly-icons",
  "phosphor-icons",
  "radix-icons",
  "remix-icon",
  "tabler-icons",
  "teenyicons",
]);

const SAFE_SVG_STYLE_PROPERTIES = new Set([
  "clip-rule",
  "color",
  "display",
  "fill",
  "fill-opacity",
  "fill-rule",
  "opacity",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "vector-effect",
  "visibility",
]);

export async function createSnippet(
  icon: IconSearchIcon,
  format: OutputFormat,
  classes: string,
  customization: IconCustomization,
): Promise<string> {
  if (format === "url") return getCustomizedSvgUrl(icon.svgUrl, customization);
  if (format === "react")
    return createReactSnippet(icon, classes, customization);
  if (format === "svg")
    return customizeSvgMarkup(
      applySvgClass(await fetchSvgMarkup(icon), classes),
      icon,
      customization,
    );

  return createUrlSnippet(icon, format, classes, customization);
}

export async function fetchSvgMarkup(icon: IconSearchIcon): Promise<string> {
  let lastError = "";

  for (const url of icon.previewUrls) {
    try {
      const response = await fetch(url, {
        headers: { accept: "image/svg+xml,text/plain,*/*" },
      });

      if (!response.ok) {
        lastError = `SVG request returned ${response.status}`;
        continue;
      }

      const text = await response.text();
      if (text.includes("<svg")) return sanitizeSvgForOutput(text.trim());
      lastError = "Response was not SVG markup";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "SVG request failed";
    }
  }

  throw new Error(`Could not fetch live SVG for ${icon.name}. ${lastError}`);
}

function createReactSnippet(
  icon: IconSearchIcon,
  classes: string,
  customization: IconCustomization,
): string {
  let usage = applyJsxClassName(
    icon.reactUsage || `<${toPascalCase(icon.name)} />`,
    classes,
  );
  usage = applyJsxProp(
    usage,
    "size",
    `{${normalizeIconSize(customization.size)}}`,
  );
  usage = applyJsxProp(
    usage,
    "color",
    `"${escapeAttribute(normalizeIconColor(customization.color))}"`,
  );
  const importText = normalizeReactImport(icon.reactImport);
  return importText ? `${importText}\n\n${usage}` : usage;
}

function createUrlSnippet(
  icon: IconSearchIcon,
  format: Exclude<OutputFormat, "react" | "svg" | "url">,
  classes: string,
  customization: IconCustomization,
): string {
  const safeClasses = escapeAttribute(classes.trim() || "w-5 h-5");
  const safeName = escapeAttribute(icon.name);
  const safeUrl = escapeAttribute(
    getCustomizedSvgUrl(icon.svgUrl, customization),
  );
  const size = normalizeIconSize(customization.size);
  const color = escapeAttribute(normalizeIconColor(customization.color));
  const style = `display: inline-block; width: ${size}px; height: ${size}px; background-color: ${color}; mask: url('${safeUrl}') center / contain no-repeat; -webkit-mask: url('${safeUrl}') center / contain no-repeat;`;

  if (format === "tailwind") {
    return `<span class="${safeClasses}" style="${style}" role="img" aria-label="${safeName}"></span>`;
  }

  if (format === "vue") {
    return `<template>\n  <span class="${safeClasses}" style="${style}" role="img" aria-label="${safeName}"></span>\n</template>`;
  }

  return `<span class="${safeClasses}" style="${style}" role="img" aria-label="${safeName}"></span>`;
}

export function customizeSvgMarkup(
  svg: string,
  icon: IconSearchIcon,
  customization: IconCustomization,
): string {
  const size = normalizeIconSize(customization.size);
  const color = normalizeIconColor(customization.color);
  let customized = setSvgRootAttribute(svg, "width", String(size));
  customized = setSvgRootAttribute(customized, "height", String(size));
  customized = setSvgRootAttribute(customized, "color", color);

  if (color === "currentColor") return customized;

  customized = customized.replace(/currentColor/gi, color);
  if (!MONOCHROME_LIBRARIES.has(icon.library)) return customized;

  return customized.replace(
    /\s(fill|stroke)\s*=\s*(["'])(.*?)\2/gi,
    (match, attribute: string, quote: string, value: string) => {
      const normalizedValue = value.trim().toLowerCase();
      if (
        normalizedValue === "none" ||
        normalizedValue === "transparent" ||
        normalizedValue.startsWith("url(")
      )
        return match;
      return ` ${attribute}=${quote}${color}${quote}`;
    },
  );
}

export function getCustomizedSvgUrl(
  value: string,
  customization: IconCustomization,
): string {
  try {
    const url = new URL(value);
    if (url.hostname !== "api.iconify.design") return value;

    const size = normalizeIconSize(customization.size);
    const color = normalizeIconColor(customization.color);
    url.searchParams.set("width", String(size));
    url.searchParams.set("height", String(size));
    if (color !== "currentColor") url.searchParams.set("color", color);
    return url.toString();
  } catch {
    return value;
  }
}

export function normalizeIconSize(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(512, Math.max(8, Math.round(parsed)));
}

export function normalizeIconColor(value: string): string {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "currentcolor") return "currentColor";
  return /^#[0-9a-f]{6}$/i.test(trimmed)
    ? trimmed.toUpperCase()
    : "currentColor";
}

function normalizeReactImport(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim().replace(/;$/, "");
  const sideEffectMatch = /^import\s+['"]([^'"]+)['"]$/.exec(trimmed);
  if (sideEffectMatch) return `import '${sideEffectMatch[1]}';`;

  const namedMatch =
    /^import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]$/.exec(trimmed);
  if (!namedMatch) return value.trim();

  const importedName = namedMatch[1].split(",")[0]?.trim();
  const moduleSpecifier = namedMatch[2];
  return importedName && moduleSpecifier
    ? `import { ${importedName} } from '${moduleSpecifier}';`
    : value.trim();
}

function applyJsxClassName(jsx: string, classes: string): string {
  const cleanClasses = classes.trim();
  if (!cleanClasses) return jsx;

  const escapedClasses = escapeAttribute(cleanClasses);
  if (/\sclassName=/.test(jsx.slice(0, 300))) {
    return jsx.replace(
      /\sclassName=(["'])(.*?)\1/,
      ` className=$1$2 ${escapedClasses}$1`,
    );
  }

  if (/\sclass=/.test(jsx.slice(0, 300))) {
    return jsx.replace(
      /\sclass=(["'])(.*?)\1/,
      ` className=$1$2 ${escapedClasses}$1`,
    );
  }

  return jsx.replace(
    /^<([A-Za-z][\w:.]*)(\s|\/?>)/,
    `<$1 className="${escapedClasses}"$2`,
  );
}

function applyJsxProp(jsx: string, name: string, value: string): string {
  const escapedName = escapeRegExp(name);
  const expressionPattern = new RegExp(`\\s${escapedName}=\\{[^}]*\\}`);
  if (expressionPattern.test(jsx))
    return jsx.replace(expressionPattern, ` ${name}=${value}`);

  const quotedPattern = new RegExp(`\\s${escapedName}=(['"])[^'"]*\\1`);
  if (quotedPattern.test(jsx))
    return jsx.replace(quotedPattern, ` ${name}=${value}`);

  return jsx.replace(/^<([A-Za-z][\w:.]*)(\s|\/?>)/, `<$1 ${name}=${value}$2`);
}

function applySvgClass(svg: string, classes: string): string {
  const cleanClasses = classes.trim();
  if (!cleanClasses) return svg;

  const escapedClasses = escapeAttribute(cleanClasses);
  if (/\sclass=/.test(svg.slice(0, 300))) {
    return svg.replace(
      /\sclass=(["'])(.*?)\1/,
      ` class=$1$2 ${escapedClasses}$1`,
    );
  }

  return svg.replace("<svg", `<svg class="${escapedClasses}"`);
}

function setSvgRootAttribute(svg: string, name: string, value: string): string {
  const escapedName = escapeRegExp(name);
  const attributePattern = new RegExp(
    `\\s${escapedName}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`,
    "i",
  );
  const attribute = ` ${name}="${escapeAttribute(value)}"`;

  return svg.replace(/<svg\b[^>]*>/i, (openingTag) =>
    attributePattern.test(openingTag)
      ? openingTag.replace(attributePattern, attribute)
      : openingTag.replace(/^<svg\b/i, `<svg${attribute}`),
  );
}

function sanitizeSvgForOutput(svg: string): string {
  const withoutBlockedElements = String(svg)
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/<link\b[\s\S]*?>/gi, "");

  const classStyles = collectClassStyles(withoutBlockedElements);
  const withoutStyleBlocks = withoutBlockedElements
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<style\b[^>]*\/>/gi, "");
  const withClassStyles = applyClassStylesToTags(
    withoutStyleBlocks,
    classStyles,
  );

  return convertInlineStylesToAttributes(withClassStyles)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<style\b[^>]*\/>/gi, "")
    .replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(on[a-z]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "")
    .trim();
}

function collectClassStyles(svg: string): Map<string, string[][]> {
  const classStyles = new Map<string, string[][]>();
  const styleBlockPattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let styleBlockMatch: RegExpExecArray | null;

  while ((styleBlockMatch = styleBlockPattern.exec(svg)) !== null) {
    const css = String(styleBlockMatch[1] || "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/<!\[CDATA\[/gi, "")
      .replace(/\]\]>/g, "");
    const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
    let ruleMatch: RegExpExecArray | null;

    while ((ruleMatch = rulePattern.exec(css)) !== null) {
      const declarations = parseStyleDeclarations(ruleMatch[2] || "");
      if (!declarations.length) continue;

      String(ruleMatch[1] || "")
        .split(",")
        .map((selector) => selector.trim().match(/^\.([_a-zA-Z][\w-]*)$/)?.[1])
        .filter((className): className is string => Boolean(className))
        .forEach((className) => {
          const current = classStyles.get(className) || [];
          classStyles.set(className, current.concat(declarations));
        });
    }
  }

  return classStyles;
}

function applyClassStylesToTags(
  svg: string,
  classStyles: Map<string, string[][]>,
): string {
  if (!classStyles.size) return svg;

  return svg.replace(
    /<([a-zA-Z][\w:.-]*)([^<>]*?)>/g,
    (tag, tagName: string, attributes: string) => {
      if (tag.startsWith("</")) return tag;

      const classMatch = attributes.match(
        /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
      );
      const classValue =
        classMatch?.[1] || classMatch?.[2] || classMatch?.[3] || "";
      if (!classValue) return tag;

      const declarations = classValue
        .split(/\s+/)
        .flatMap((className) => classStyles.get(className) || []);
      if (!declarations.length) return tag;
      return buildTagWithStyleAttributes(tagName, attributes, "", declarations);
    },
  );
}

function convertInlineStylesToAttributes(svg: string): string {
  return svg.replace(
    /<([a-zA-Z][\w:.-]*)([^<>]*?)\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))([^<>]*?)>/gi,
    (
      _tag,
      tagName: string,
      before: string,
      doubleQuoted: string,
      singleQuoted: string,
      unquoted: string,
      after: string,
    ) => {
      const styleValue = doubleQuoted || singleQuoted || unquoted || "";
      return buildTagWithStyleAttributes(
        tagName,
        before,
        after,
        parseStyleDeclarations(styleValue),
      );
    },
  );
}

function parseStyleDeclarations(styleValue: string): string[][] {
  return String(styleValue)
    .split(";")
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex === -1) return null;

      const property = declaration
        .slice(0, separatorIndex)
        .trim()
        .toLowerCase();
      const value = declaration.slice(separatorIndex + 1).trim();

      if (
        !SAFE_SVG_STYLE_PROPERTIES.has(property) ||
        !isSafeSvgStyleValue(value)
      )
        return null;
      return [property, value];
    })
    .filter((declaration): declaration is string[] => Boolean(declaration));
}

function buildTagWithStyleAttributes(
  tagName: string,
  before: string,
  after: string,
  declarations: string[][],
): string {
  const existingAttributes = `${before || ""} ${after || ""}`;
  const nextAttributes = declarations
    .filter(
      ([property]) =>
        !new RegExp(`\\s${escapeRegExp(property)}\\s*=`, "i").test(
          existingAttributes,
        ),
    )
    .map(([property, value]) => ` ${property}="${escapeAttribute(value)}"`)
    .join("");

  return `<${tagName}${before || ""}${nextAttributes}${after || ""}>`;
}

function isSafeSvgStyleValue(value: string): boolean {
  const normalized = String(value).trim().toLowerCase();
  return (
    Boolean(normalized) &&
    !normalized.includes("javascript:") &&
    !normalized.includes("expression(") &&
    !normalized.includes("<") &&
    !normalized.includes(">")
  );
}

function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function escapeAttribute(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

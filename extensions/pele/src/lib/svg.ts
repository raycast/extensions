import { DOMParser, XMLSerializer, type Element } from "@xmldom/xmldom";
import { getTheme } from "./themes";

function resolveVariables(value: string, variables: Map<string, string>, chain: string[] = []): string {
  let result = "";
  let offset = 0;
  while (true) {
    const start = value.indexOf("var(", offset);
    if (start < 0) return result + value.slice(offset);
    result += value.slice(offset, start);
    let end = start + 4;
    let depth = 1;
    while (end < value.length && depth > 0) {
      if (value[end] === "(") depth++;
      if (value[end] === ")") depth--;
      end++;
    }
    if (depth !== 0) throw new Error("Invalid color variable in the rendered SVG.");
    const expression = value.slice(start + 4, end - 1);
    const comma = expression.indexOf(",");
    const name = (comma < 0 ? expression : expression.slice(0, comma)).trim();
    const replacement = variables.get(name) ?? (comma < 0 ? undefined : expression.slice(comma + 1).trim());
    if (replacement === undefined || chain.includes(name)) throw new Error(`Cannot resolve SVG variable ${name}.`);
    result += resolveVariables(replacement, variables, [...chain, name]);
    offset = end;
  }
}

/** Resolve Pele's CSS variables for SVG consumers that do not implement CSS custom properties. */
export function prepareSvg(svg: string, themeId: string, transparent: boolean): string {
  const theme = getTheme(themeId);
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = document.documentElement;
  if (!root || root.localName !== "svg") throw new Error("Pele did not return an SVG diagram.");
  const themeVariables = new Map(Object.entries(theme.colors).map(([key, value]) => [`--pele-${key}`, value]));

  function visit(element: Element, inherited: Map<string, string>) {
    const variables = new Map(inherited);
    const declarations = (element.getAttribute("style") ?? "").split(";").filter(Boolean);
    for (const declaration of declarations) {
      const colon = declaration.indexOf(":");
      const name = declaration.slice(0, colon).trim();
      if (name.startsWith("--")) variables.set(name, declaration.slice(colon + 1).trim());
    }
    const style = declarations.filter((declaration) => !declaration.trim().startsWith("--")).join(";");
    if (style) element.setAttribute("style", style);
    else element.removeAttribute("style");
    for (let i = 0; i < element.attributes.length; i++) {
      const attribute = element.attributes.item(i);
      if (attribute) element.setAttribute(attribute.name, resolveVariables(attribute.value, variables));
    }
    // Pele uses SVG 2 CSS radii; resvg expects SVG presentation attributes.
    const resolvedStyle = (element.getAttribute("style") ?? "").split(";");
    const remainingStyle = resolvedStyle
      .filter((declaration) => {
        const colon = declaration.indexOf(":");
        const property = declaration.slice(0, colon).trim();
        if (property !== "rx" && property !== "ry") return true;
        element.setAttribute(property, declaration.slice(colon + 1).trim());
        return false;
      })
      .join(";");
    if (remainingStyle) element.setAttribute("style", remainingStyle);
    else element.removeAttribute("style");
    for (let i = 0; i < element.children.length; i++) visit(element.children[i], variables);
  }

  visit(root, themeVariables);
  if (!transparent) {
    const background = document.createElementNS(root.namespaceURI, "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", theme.colors.bg);
    root.insertBefore(background, root.firstChild);
  }
  return new XMLSerializer().serializeToString(root);
}

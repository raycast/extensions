import { marked } from "marked";

/**
 * Shared markdown can come from anyone on the network, so the rendered HTML is filtered before it reaches the
 * page: only presentational elements survive, event handlers and `javascript:` links are dropped, and images
 * that point at a sibling file are rewritten to the API so a README can show its own screenshots.
 */
const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i",
  "img", "input", "kbd", "li", "ol", "p", "pre", "s", "span", "strong", "sub", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "tr", "ul",
]);

/** Tags that must go away together with everything inside them. */
const DROPPED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "form", "svg", "math"]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  input: new Set(["type", "checked", "disabled"]),
  ol: new Set(["start"]),
  td: new Set(["align", "colspan", "rowspan"]),
  th: new Set(["align", "colspan", "rowspan", "scope"]),
  code: new Set(["class"]),
};

const SAFE_SCHEME = /^(https?|mailto):/i;

export type ImageResolver = (source: string) => string | undefined;

export function renderMarkdown(source: string, resolveImage?: ImageResolver): string {
  const parsed = marked.parse(source, { gfm: true, async: false });
  if (typeof parsed !== "string") return "";
  const template = document.createElement("template");
  template.innerHTML = parsed;
  sanitize(template.content, resolveImage);
  return template.innerHTML;
}

function sanitize(root: ParentNode, resolveImage?: ImageResolver): void {
  for (const element of Array.from(root.querySelectorAll("*"))) {
    const tag = element.tagName.toLowerCase();
    if (DROPPED_TAGS.has(tag)) {
      element.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const allowed = ALLOWED_ATTRIBUTES[tag];
    for (const attribute of Array.from(element.attributes)) {
      if (!allowed?.has(attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
    }

    if (tag === "a") {
      const href = element.getAttribute("href") ?? "";
      if (href !== "" && !SAFE_SCHEME.test(href) && !href.startsWith("#") && !href.startsWith("/")) {
        element.removeAttribute("href");
      }
      if (SAFE_SCHEME.test(href)) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noreferrer");
      }
      continue;
    }

    if (tag === "img") {
      const src = element.getAttribute("src") ?? "";
      if (src === "" || /^\s*javascript:/i.test(src)) {
        element.remove();
        continue;
      }
      const resolved = resolveImage?.(src);
      if (resolved !== undefined) element.setAttribute("src", resolved);
      element.setAttribute("loading", "lazy");
      continue;
    }

    if (tag === "input") element.setAttribute("disabled", "");
  }
}

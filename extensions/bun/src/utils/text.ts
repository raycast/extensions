import escapeStringRegexp from "escape-string-regexp";

export function applyFunctionToTags(s: string, start: string, end: string, f: (s: string) => string) {
  return s.replace(
    new RegExp(`${escapeStringRegexp(start)}(.*?)${escapeStringRegexp(end)}`, "gs"),
    (_, inside: string) => f(inside),
  );
}

export function bunDocsMarkdownToRealMarkdown(s: string) {
  // images
  s = applyFunctionToTags(s, '{% image src="', '" /%}', (src) => `<img src="${src}" />`);

  // callouts
  s = applyFunctionToTags(s, "{% callout %}", "{% /callout %}", (content) => content.replace(/^/gm, "> "));

  return s;
}

import { useMemo } from "react";
import { renderMarkdown, type ImageResolver } from "../lib/markdown";

/** Renders shared markdown files; the HTML is filtered by `renderMarkdown` before it reaches the page. */
export function Markdown({ source, resolveImage }: { source: string; resolveImage?: ImageResolver }) {
  const html = useMemo(() => renderMarkdown(source, resolveImage), [source, resolveImage]);
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

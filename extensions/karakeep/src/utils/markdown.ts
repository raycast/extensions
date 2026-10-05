interface MarkdownImageOptions {
  raycastWidth?: number;
  raycastHeight?: number;
}

function withRaycastImageSize(src: string, options?: MarkdownImageOptions) {
  const params = new URLSearchParams();
  if (options?.raycastWidth) {
    params.set("raycast-width", String(options.raycastWidth));
  }
  if (options?.raycastHeight) {
    params.set("raycast-height", String(options.raycastHeight));
  }

  const query = params.toString();
  if (!query) return src;

  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}${query}`;
}

export function markdownImage(src: string, alt = "Preview", options?: MarkdownImageOptions) {
  const safeAlt = alt.replace(/[[\]]/g, "");
  const sizedSrc = withRaycastImageSize(src, options);
  const safeSrc = /\s/.test(sizedSrc) ? `<${sizedSrc.replace(/</g, "%3C").replace(/>/g, "%3E")}>` : sizedSrc;
  return `![${safeAlt}](${safeSrc})`;
}

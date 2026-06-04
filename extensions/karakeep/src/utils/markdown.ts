export function markdownImage(src: string, alt = "Preview") {
  const safeAlt = alt.replace(/[[\]]/g, "");
  const safeSrc = /\s/.test(src) ? `<${src.replace(/>/g, "%3E")}>` : src;
  return `![${safeAlt}](${safeSrc})`;
}

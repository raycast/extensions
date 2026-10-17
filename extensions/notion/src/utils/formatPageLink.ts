export function formatPageLink(title: string, url: string) {
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const label = title.replace(/([\\`*_{}[\]<>])/g, "\\$1").replace(/\r?\n/g, " ");
  const destination = url.replace(/\(/g, "%28").replace(/\)/g, "%29");

  return {
    html: `<a href="${escapeHtml(url)}">${escapeHtml(title)}</a>`,
    text: `[${label}](${destination})`,
  };
}

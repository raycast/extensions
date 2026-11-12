// Bear 2 links an embedded image by file name alone, `![](Screenshot%201.png)`, which Raycast cannot
// load. Point each such link at the attachment's file on disk, through the note's imagePaths; an
// image whose file is not there becomes a short placeholder instead of a broken image. Links with
// a scheme (https:, file:) or an absolute path are left alone.
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g;

function fileUrl(path: string): string {
  // encodeURIComponent leaves ( and ) alone, and an unbalanced one would end the Markdown link early
  const segment = (s: string) => encodeURIComponent(s).replace(/\(/g, "%28").replace(/\)/g, "%29");
  return "file://" + path.split("/").map(segment).join("/");
}

export function resolveBearImages(text: string, imagePaths: Record<string, string>): string {
  return text.replace(MARKDOWN_IMAGE, (whole, alt: string, url: string, title: string | undefined) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("/")) return whole;
    let name = url;
    try {
      name = decodeURIComponent(url);
    } catch {
      // a stray % in the name: look it up as written
    }
    const path = imagePaths[name.normalize("NFC")];
    if (path === undefined) return `*(image not found: ${name})*`;
    return `![${alt}](${fileUrl(path)}${title ?? ""})`;
  });
}

export function formatFileSize(size: number) {
  if (!size || Number.isNaN(size)) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;
  return `${value.toFixed(2)} ${units[index]}`;
}

export function formatTime(date: Date) {
  return date.toLocaleString();
}

export function buildMarkdownLink(url: string) {
  return `![image](${url})`;
}

export function buildHtmlLink(url: string) {
  return `<img src="${url}" alt="image" />`;
}

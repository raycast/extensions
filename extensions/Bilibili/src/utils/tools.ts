export function formatUrl(url: string) {
  return url.replace("http://", "https://").replace(/^\/\//, "https://");
}

export function secondToDate(second: number) {
  const h = Math.floor(second / 3600);
  const m = Math.floor((second / 60) % 60);
  const s = Math.floor(second % 60);

  return `${h ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatNumber(number: number | undefined) {
  return number ? (number > 9999 ? `${(number / 1000).toFixed(1)}K` : String(number)) : "";
}

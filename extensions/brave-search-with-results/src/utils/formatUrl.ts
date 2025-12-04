export default function formatUrl(url: URL) {
  url = new URL(url.toString());

  const host = url.host.replace("www.", "");
  const pathname = url.pathname === "/" ? "" : url.pathname;

  return host + pathname;
}

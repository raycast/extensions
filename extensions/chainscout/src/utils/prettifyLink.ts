export default function prettifyLink(link: string) {
  try {
    const url = new URL(link);
    return url.hostname.replace("www.", "");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return link;
  }
}

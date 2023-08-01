export function getAddressParts(text: string | undefined | null) {
  if (!text) {
    return undefined;
  }
  const regex = /([^<]+)<([^>]+)>/;

  const match = text.match(regex);

  if (match) {
    const name = match[1].trim().replaceAll('"', "");
    const email = match[2].trim().replaceAll('"', "");
    return { name, email };
  } else {
    return undefined;
  }
}

export function splitUrl(url: string) {
  const urlWithoutProtocol = url.replace(/^https?:\/\//, "");
  const parts = urlWithoutProtocol.split(".");
  return parts[0] + ".ssh." + parts[1] + "." + parts[2] + "." + parts[3];
}

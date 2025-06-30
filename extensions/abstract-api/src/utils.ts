export function extractHostname(url: string) {
  let hostname;

  // find and remove protocol (http, ftp, etc.) and get hostname
  if (url.indexOf("//") > -1) {
    hostname = url.split("/")[2];
  } else {
    hostname = url.split("/")[0];
  }

  // find and remove port number
  hostname = hostname.split(":")[0];
  // find and remove "?"
  hostname = hostname.split("?")[0];

  return hostname;
}

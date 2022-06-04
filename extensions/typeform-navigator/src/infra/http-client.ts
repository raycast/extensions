import got from "got";

export function createJsonHttpClient(personalToken: string): typeof got {
  return got.extend({
    prefixUrl: "https://api.typeform.com",
    responseType: "json",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${personalToken}`,
    },
  });
}

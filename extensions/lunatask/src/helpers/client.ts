import { getPreferenceValues } from "@raycast/api";

const { accessToken } = getPreferenceValues<Preferences>();

const prefixURL = "https://api.lunatask.app/v1";
const headers = {
  "Content-Type": "application/json",
  Authorization: `bearer ${accessToken}`,
};

const client = {
  post: (url: string, body: object) =>
    fetch(`${prefixURL}/${url}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    }),
};

export default client;

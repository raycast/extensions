import { getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";

const { accessToken } = getPreferenceValues();

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
  credentials: "same-origin",
};

export default client;

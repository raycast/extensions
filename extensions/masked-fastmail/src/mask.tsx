import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  hostname: string;
  username: string;
  password: string;
}

const { hostname, username, password } = getPreferenceValues<Preferences>();

const auth_url = `https://${hostname}/.well-known/jmap`;
const auth_token = Buffer.from(`${username}:${password}`).toString("base64");

const getSession = async () => {
  const response = await fetch(auth_url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `basic ${auth_token}`,
    },
  });
  return response.json();
};

export default async () => {
  const session = await getSession();
  console.log(session);
};

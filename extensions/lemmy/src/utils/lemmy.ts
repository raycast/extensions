import { getPreferenceValues } from "@raycast/api";
import { LemmyHttp } from "lemmy-js-client";

const baseUrl = getPreferenceValues().instanceUrl;

export const client: LemmyHttp = new LemmyHttp(baseUrl);

let jwt = "";

export const getJwt = async () => {
  if (!jwt) {
    jwt = (
      await client.login({
        username_or_email: getPreferenceValues().username,
        password: getPreferenceValues().password,
      })
    ).jwt as string;
  }

  return jwt;
};

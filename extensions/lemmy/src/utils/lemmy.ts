import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { LemmyHttp } from "lemmy-js-client";

const baseUrl = getPreferenceValues().instanceUrl;

export const client: LemmyHttp = new LemmyHttp(baseUrl);

let jwt = "";

export const getJwt = async () => {
  if (!jwt) {
    try {
      jwt = (
        await client.login({
          username_or_email: getPreferenceValues().username,
          password: getPreferenceValues().password,
        })
      ).jwt as string;
    } catch (e) {
      showToast({
        title: "Error",
        message: "Could not login to Lemmy instance",
        style: Toast.Style.Failure,
      });
      return "";
    }
  }

  return jwt;
};

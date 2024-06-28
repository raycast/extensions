import { useFetch } from "@raycast/utils";
import { ArgumentTypes } from "../types/ArgumentTypes";
import { getPreferenceValues } from "@raycast/api";

export const useCTFetch = (apiPath: string, args?: ArgumentTypes<typeof useFetch>[1]) => {
  const { loginToken, instanceUrl } = getPreferenceValues<Preferences>();

  const apiUrl = `https://${instanceUrl}/api${apiPath}`;

  if (args) {
    args.headers = {
      ...args.headers,
      Authorization: `Login ${loginToken}`,
    };
  } else {
    args = {
      headers: {
        Authorization: `Login ${loginToken}`,
      },
    };
  }

  const response = useFetch(apiUrl, args);

  if (response.data && typeof response.data === "object" && "data" in response.data) {
    return { ...response, data: response.data.data };
  } else if (response.data === undefined) {
    return { ...response, data: undefined };
  } else {
    throw new Error("Invalid response");
  }
};

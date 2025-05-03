import { Toast, getPreferenceValues, showToast } from "@raycast/api";

import { InvalidTokenError } from "./error";

/**
 * Returns the current access token
 */
export function getAccessToken() {
  return String(getPreferenceValues().accessToken);
}

const isValidToken = () => {
  const token = getAccessToken();
  if (token.length === 0 || !token.startsWith("ddp_")) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid token detected. Please set one in the settings.",
    });
    throw new InvalidTokenError("Invalid token length detected");
  } else {
    return true;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withValidToken = <T extends (...args: any[]) => any>(fn: T) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    isValidToken();
    return fn(...args);
  };
};

export default isValidToken;

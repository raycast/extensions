import { showToast } from "@raycast/api";
import { Detail } from "@raycast/api";
import { useState, useMemo } from "react";
import PutioAPI, { IAccountInfo } from "@putdotio/api-client";
import { localizeError, localizedErrorToToastOptions } from "./localizeError";
import { getAuthToken } from "../utils";

let putioClient: PutioAPI | null = null;
let accountInfo: IAccountInfo | null = null;

export const withPutioClient = (component: JSX.Element) => {
  const [x, forceRerender] = useState(0);

  useMemo(() => {
    (async function () {
      const token = getAuthToken();
      putioClient = new PutioAPI({ clientID: 6311 });
      putioClient.setToken(token);

      try {
        const accountInfoResponse = await putioClient.Account.Info();
        accountInfo = accountInfoResponse.data.info;
        forceRerender(x + 1);
      } catch (error) {
        showToast(localizedErrorToToastOptions(localizeError(error)));
      }
    })();
  }, []);

  if (!accountInfo) {
    return <Detail isLoading />;
  }

  return component;
};

export const getPutioClient = () => {
  if (!accountInfo || !putioClient) {
    throw new Error("getPutioClient must be used when authenticated");
  }

  return putioClient;
};

export const getPutioAccountInfo = () => {
  if (!accountInfo || !putioClient) {
    throw new Error("getPutioAccountInfo must be used when authenticated");
  }

  return accountInfo;
};

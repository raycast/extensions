import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";

import { preferences } from "../helpers/preferences";

export const getSecret = async (secretEngine: string, path: string): Promise<Secret | undefined> => {
  try {
    const response = await fetch(`${preferences.address}/v1/${secretEngine}data${path}`, {
      method: "get",
      headers: {
        "X-Vault-Token": preferences.token,
      },
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      return (json as PathsJSON).data.data;
    } else {
      if (
        (json as Record<string, unknown>).errors &&
        ((json as Record<string, unknown>).errors as string[]).length > 0
      ) {
        throw new Error(((json as Record<string, unknown>).errors as string[])[0]);
      } else {
        throw new Error("An unknown error occured");
      }
    }
  } catch (err) {
    showToast(ToastStyle.Failure, `Could not get secret: ${err.message}`);
    return Promise.resolve(undefined);
  }
};

type PathsJSON = {
  data: SecretData;
};

type SecretData = {
  data: Secret;
};

export type Secret = {
  [key: string]: string;
};

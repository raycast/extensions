import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";

import { preferences } from "../helpers/preferences";

export const getSecretEngines = async (): Promise<SecretEngine[]> => {
  try {
    const response = await fetch(`${preferences.address}/v1/sys/mounts`, {
      method: "get",
      headers: {
        "X-Vault-Token": preferences.token,
      },
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      return Object.keys((json as SecretEngines).data).map((key) => {
        return {
          name: key,
        };
      });
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
    showToast(ToastStyle.Failure, `Could not load secret engines: ${err.message}`);
    return Promise.resolve([]);
  }
};

type SecretEngines = {
  data: SecretEngineData;
};

type SecretEngineData = {
  [key: string]: unknown;
};

export type SecretEngine = {
  name: string;
};

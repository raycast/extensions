import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";

import { preferences } from "../helpers/preferences";

export const getPaths = async (secretEngine: string, path: string): Promise<string[]> => {
  try {
    const response = await fetch(`${preferences.address}/v1/${secretEngine}metadata${path}?list=true`, {
      method: "get",
      headers: {
        "X-Vault-Token": preferences.token,
      },
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      return (json as PathsJSON).data.keys;
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
    showToast(ToastStyle.Failure, `Could not load paths: ${err.message}`);
    return Promise.resolve([]);
  }
};

type PathsJSON = {
  data: PathsData;
};

type PathsData = {
  keys: string[];
};

import { getApiKey } from "./key";
import fetch, { Response } from "node-fetch";
import { showToast, Toast } from "@raycast/api";
import { API_URL, getHeaders } from "../config";

export const toggleAlias = async (email: string, newState: boolean) => {
  const headers = getHeaders(getApiKey());

  let res: Response;

  if (!newState) {
    res = await fetch(`${API_URL}/delete-aliases`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        email,
      }),
    });
  } else {
    res = await fetch(`${API_URL}/active-aliases`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
      }),
    });
  }

  if (res.status === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error creating",
      message:
        "❌ HideMail API credentials are invalid. Create new API Token and update it on Raycast extension preferences",
    });

    return false;
  }

  return res.status === (newState ? 200 : 204);
};

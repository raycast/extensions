import { getApiKey } from "./key";
import fetch from "node-fetch";
import { showToast, Toast } from "@raycast/api";

export const editAlias = async (id: string, description: string | null = null) => {
  const res = await fetch(`https://app.anonaddy.com/api/v1/aliases/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
    body: JSON.stringify({
      description,
    }),
  });

  if (res.status === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error editing",
      message: "AnonAddy API credentials are invalid",
    });
    return false;
  }

  return res.status === 200;
};

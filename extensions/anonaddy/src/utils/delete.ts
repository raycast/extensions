import { getApiKey } from "./key";
import fetch from "node-fetch";
import { showToast, Toast } from "@raycast/api";

export const deleteAlias = async (id: string) => {
  const res = await fetch(`https://app.anonaddy.com/api/v1/aliases/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
  });

  if (res.status === 401) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error deleting",
      message: "AnonAddy API credentials are invalid",
    });

    return false;
  }

  return res.status === 204;
};

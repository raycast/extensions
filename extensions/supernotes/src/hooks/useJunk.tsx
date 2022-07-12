import React from "react";

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

import { SUPERNOTES_API_URL } from "../util/defines";
import { SupernotesErrorPayload } from "../util/types";

const useJunk = (successCallback: () => void) => {
  const { apiKey } = getPreferenceValues();

  const [loading, setLoading] = React.useState(false);

  const junk = async (cardId: string) => {
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Junking",
      message: "Moving card to junk",
    });
    try {
      if (!apiKey) throw new Error("No API key found");
      const res = await fetch(`${SUPERNOTES_API_URL}/cards/${cardId}/junk`, {
        method: "PUT",
        headers: { "Api-Key": apiKey },
      });
      setLoading(false);
      if (res.status !== 200) {
        const jsonError = await res.json();
        throw new Error((jsonError as SupernotesErrorPayload).detail);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "Card junked";
      successCallback();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = String(err);
    }
    setTimeout(() => toast.hide(), 3000);
  };

  return { junk, loading };
};

export default useJunk;

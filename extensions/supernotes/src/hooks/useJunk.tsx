import React from "react";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch from "node-fetch";

import { SUPERNOTES_API_URL, Status } from "utils/defines";
import { ValidationError, WrappedCardResponses } from "utils/types";

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
      const res = await fetch(`${SUPERNOTES_API_URL}/cards/`, {
        method: "PATCH",
        headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ [cardId]: { membership: { status: Status.DISABLED } } }),
      });
      setLoading(false);
      const jsonData = (await res.json()) as WrappedCardResponses | ValidationError;
      if ("errors" in jsonData) throw new Error(jsonData.errors.body);
      const wrapped_card = jsonData[0];
      // error checking
      if (wrapped_card.card_id !== cardId) throw new Error("Card mismatch");
      if (!wrapped_card.success) throw new Error(wrapped_card.payload);
      // success
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

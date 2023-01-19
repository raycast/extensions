import React from "react";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import fetch from "node-fetch";

import { SUPERNOTES_API_URL } from "utils/defines";
import { ICard, ValidationError, WrappedCardResponses } from "utils/types";

export interface SimpleCardData {
  name: string;
  markup: string;
}

const useCreate = (successCallback: (card: ICard) => void) => {
  const { apiKey } = getPreferenceValues();

  const [loading, setLoading] = React.useState(false);

  const create = async (data: SimpleCardData) => {
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating",
      message: "Sending card to Supernotes",
    });
    try {
      if (!apiKey) throw new Error("No API key found");
      const res = await fetch(`${SUPERNOTES_API_URL}/cards/simple`, {
        method: "POST",
        body: JSON.stringify({ name: data.name, markup: data.markup }),
        headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
      });
      const jsonData = (await res.json()) as WrappedCardResponses | ValidationError;
      if ("errors" in jsonData) throw new Error(jsonData.errors.body);
      const wrapped_card = jsonData[0];
      // error checking
      if (!wrapped_card.success) throw new Error(wrapped_card.payload);
      // success
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "Card created";
      successCallback(wrapped_card.payload);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Card Creation Failed";
      toast.message = String(err);
    }
    setLoading(false);
    setTimeout(() => toast.hide(), 3000);
  };

  return { create, loading };
};

export default useCreate;

import React from "react";

import { Toast, getPreferenceValues, showToast, Clipboard } from "@raycast/api";
import fetch from "node-fetch";

import { SUPERNOTES_API_URL } from "utils/defines";
import { ICard, SupernotesErrorPayload } from "utils/types";

export interface SimpleCardData {
  name: string;
  markup: string;
}

const useCreate = () => {
  const { apiKey } = getPreferenceValues();

  const [loading, setLoading] = React.useState(false);

  const create = async (data: SimpleCardData, successCallback: (card: ICard) => void) => {
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
      const jsonData = await res.json();
      if (res.status !== 200) {
        throw new Error((jsonData as SupernotesErrorPayload).detail);
      }
      toast.hide();
      successCallback(jsonData as ICard);
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

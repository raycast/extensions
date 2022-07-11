import React from "react";

import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

import { ICard, SupernotesErrorPayload } from "../util/types";
import { SUPERNOTES_API_URL } from "../util/defines";

export interface SimpleCardData {
  name: string;
  markup: string;
}

const useCreate = (callback: (card: ICard) => void) => {
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
      const jsonData = await res.json();
      setLoading(false);
      if (res.status !== 200) {
        throw new Error((jsonData as SupernotesErrorPayload).detail);
      }
      callback(jsonData as ICard);
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = "Card created";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Card Creation Failed";
      toast.message = String(err);
    }
    setTimeout(() => toast.hide(), 3000);
  };

  return { create, loading };
};

export default useCreate;

import { showToast, Toast } from "@raycast/api";
import { superfetch } from "api/superfetch";
import React from "react";

import { getSupernotesPrefs } from "~/utils/helpers";
import type { ICard, ISimpleCard } from "~/utils/types";

const useCreate = (successCallback: (card: ICard) => void) => {
  const { apiKey } = getSupernotesPrefs();

  const [loading, setLoading] = React.useState(false);

  const create = async (data: ISimpleCard) => {
    setLoading(true);
    await showToast(Toast.Style.Animated, "Creating", "Sending card to Supernotes");
    const fetched = await superfetch("/v1/cards/simple", "post", {
      body: { name: data.name, markup: data.markup },
      apiKey,
    });
    if (!fetched.ok) {
      showToast(Toast.Style.Failure, "Card Creation Failed", fetched.body.detail);
      return;
    }
    const wrappedCard = fetched.body[0];
    if (!wrappedCard.success) {
      showToast(Toast.Style.Failure, "Card Creation Failed", wrappedCard.payload);
      return;
    }
    await showToast(Toast.Style.Success, "Success", "Card created");
    successCallback(wrappedCard.payload);
    setLoading(false);
  };

  return { create, loading };
};

export default useCreate;

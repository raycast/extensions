import { showToast, Toast } from "@raycast/api";
import { superfetch } from "api/superfetch";
import React from "react";

import { Status } from "~/utils/defines";
import { getSupernotesPrefs } from "~/utils/helpers";

const useJunk = (successCallback: () => void) => {
  const { apiKey } = getSupernotesPrefs();

  const [loading, setLoading] = React.useState(false);

  const junk = async (cardId: string) => {
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Junking",
      message: "Moving card to junk",
    });
    const fetched = await superfetch("/v1/cards", "patch", {
      apiKey,
      body: { [cardId]: { membership: { status: Status.DISABLED } } },
    });
    setLoading(false);
    if (!fetched.ok) {
      showToast(Toast.Style.Failure, "Junk failed", fetched.body.detail);
      return;
    }
    const wrappedCard = fetched.body[0];
    if (!wrappedCard.success) {
      showToast(Toast.Style.Failure, "Junk failed", wrappedCard.payload);
      return;
    }
    if (wrappedCard.card_id !== cardId) throw new Error("Card mismatch");
    toast.style = Toast.Style.Success;
    toast.title = "Success";
    toast.message = "Card junked";
    successCallback();
    setTimeout(() => toast.hide(), 3000);
  };

  return { junk, loading };
};

export default useJunk;

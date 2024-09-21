import { popToRoot, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";

import { superfetch } from "~/api/superfetch";
import { getSupernotesPrefs, textToSimpleCard } from "~/utils/helpers";
import type { ICard } from "~/utils/types";

export async function sendToDaily(text: string) {
  const { apiKey } = getSupernotesPrefs();
  await showToast({ style: Toast.Style.Animated, title: "Sending to Daily Card" });
  const fetched = await superfetch("/v1/cards/daily", "put", { apiKey, body: { markup: text } });
  await showHUD(fetched.ok ? `✅ Added to Daily Card` : `🚫 Error: ${fetched.body.detail}`, {
    popToRootType: PopToRootType.Immediate,
  });
  popToRoot({ clearSearchBar: true });
}

export async function sendToCard(text: string, card: ICard) {
  const { apiKey } = getSupernotesPrefs();
  await showToast({ style: Toast.Style.Animated, title: `Sending to "${card.data.name}"` });
  const fetched = await superfetch(`/v1/cards/simple/{card_id}/append`, "put", {
    apiKey,
    path: { card_id: card.data.id },
    body: text,
  });
  await showHUD(
    fetched.ok
      ? `✅ Added to "${card.data.name}"`
      : `🚫 Error adding to card: ${fetched.body.detail}`,
    {
      popToRootType: PopToRootType.Immediate,
    },
  );
}

export async function sendToNew(text: string) {
  const { apiKey } = getSupernotesPrefs();
  const simple = textToSimpleCard(text);
  if (!simple) {
    await showToast({ style: Toast.Style.Failure, title: "Card data coulnd't be extracted" });
    return;
  }
  await showToast({ style: Toast.Style.Animated, title: "Sending to new card" });
  const fetched = await superfetch("/v1/cards/simple", "post", { apiKey, body: simple });
  await showHUD(
    fetched.ok ? `✅ Created new card` : `🚫 Error creating card: ${fetched.body.detail}`,
    {
      popToRootType: PopToRootType.Immediate,
    },
  );
}

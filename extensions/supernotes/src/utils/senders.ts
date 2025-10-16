import { popToRoot, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";

import { superfetch } from "~/api/superfetch";
import { getSupernotesPrefs, textToSimpleCard } from "~/utils/helpers";
import type { ICard } from "~/utils/types";

export async function sendToDaily(text: string, headless?: boolean) {
  const { apiKey } = getSupernotesPrefs();
  if (headless) {
    await showHUD("↗️ Sending to Daily Card");
  } else {
    await showToast({ style: Toast.Style.Animated, title: "Sending to Daily Card" });
  }
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const fetched = await superfetch("/v1/cards/daily", "put", {
    apiKey,
    body: { markup: text, local_date: localDate },
  });
  await showHUD(fetched.ok ? `✅ Added to Daily Card` : `🚫 Error: ${fetched.body.detail}`);
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

import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Pollenflug } from "./types";

export async function handlePin(pollenName: string) {
  pollenName = pollenName.toLowerCase();

  const pollenResponse = (await LocalStorage.getItem<string>("pollen")) || { pinned: [] };

  const pollen = typeof pollenResponse === "string" ? JSON.parse(pollenResponse) : pollenResponse;

  if (pollen.pinned.includes(pollenName)) {
    pollen.pinned = pollen.pinned.filter((item: string) => item !== pollenName);
  } else {
    pollen.pinned.push(pollenName);
  }

  await LocalStorage.setItem("pollen", JSON.stringify(pollen));

  return pollen.pinned;
}

export async function getPinned() {
  const pollenResponse = (await LocalStorage.getItem<string>("pollen")) || { pinned: [] };
  const pollen = typeof pollenResponse === "string" ? JSON.parse(pollenResponse) : pollenResponse;
  return pollen.pinned;
}

export function usePinned(pollenflug?: Pollenflug) {
  const [pinned, setPinned] = useCachedState<string[]>("pinned", []);

  const [pinnedItems, setPinnedItems] = useCachedState<Pollenflug["pollen"]>("pinned_items", []);
  const [unpinnedItems, setUnpinnedItems] = useCachedState<Pollenflug["pollen"]>("unpinned_items", []);

  useEffect(() => {
    getPinned().then((pinned) => setPinned(pinned));
  }, []);

  useEffect(() => {
    if (!pollenflug || pollenflug.pollen === undefined) {
      return;
    }
    const pinnedItems = pollenflug.pollen.filter((item) => pinned.includes(item.name.toLowerCase()));
    const unpinnedItems = pollenflug.pollen.filter((item) => !pinned.includes(item.name.toLowerCase()));
    setPinnedItems(pinnedItems);
    setUnpinnedItems(unpinnedItems);
  }, [pollenflug, pollenflug?.pollen, pinned]);

  const hasPinned = pinnedItems.length > 0;

  return { pinnedItems, unpinnedItems, hasPinned, setPinned };
}

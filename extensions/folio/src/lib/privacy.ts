import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

const KEY = "folio.privacy";

export async function getPrivacy(): Promise<boolean> {
  const v = await LocalStorage.getItem<string>(KEY);
  return v === "1";
}

export async function setPrivacy(on: boolean): Promise<void> {
  await LocalStorage.setItem(KEY, on ? "1" : "0");
}

export async function togglePrivacy(): Promise<boolean> {
  const next = !(await getPrivacy());
  await setPrivacy(next);
  return next;
}

/** Privacy flag with a stable initial render (undefined -> masked until known, so balances never flash). */
export function usePrivacy(): { privacy: boolean; ready: boolean; toggle: () => Promise<void> } {
  const [state, setState] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let live = true;
    getPrivacy().then((v) => live && setState(v));
    return () => {
      live = false;
    };
  }, []);
  const toggle = useCallback(async () => {
    const next = await togglePrivacy();
    setState(next);
  }, []);
  return { privacy: state ?? true, ready: state !== undefined, toggle };
}

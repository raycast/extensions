import { LocalStorage } from "@raycast/api";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Subscription } from "./types";

const STORAGE_KEY = "subscriptions-v1";

let _cache: Subscription[] | null = null;
const _setters = new Set<Dispatch<SetStateAction<Subscription[]>>>();

function notify() {
  _setters.forEach((set) => set([...(_cache ?? [])]));
}

async function persist(subs: Subscription[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(_cache ?? []);
  const [isLoading, setIsLoading] = useState(_cache === null);

  useEffect(() => {
    _setters.add(setSubscriptions);

    if (_cache === null) {
      LocalStorage.getItem<string>(STORAGE_KEY).then((raw) => {
        try {
          _cache = raw ? (JSON.parse(raw) as Subscription[]) : [];
        } catch {
          _cache = [];
        }
        setIsLoading(false);
        notify();
      });
    } else {
      setIsLoading(false);
      // Sync with latest cache on mount (covers remount after navigation)
      setSubscriptions([..._cache]);
    }

    return () => {
      _setters.delete(setSubscriptions);
    };
  }, []);

  async function addSubscription(sub: Subscription) {
    _cache = [...(_cache ?? []), sub];
    notify();
    await persist(_cache);
  }

  async function updateSubscription(id: string, updates: Partial<Subscription>) {
    _cache = (_cache ?? []).map((s) => (s.id === id ? { ...s, ...updates } : s));
    notify();
    await persist(_cache);
  }

  async function deleteSubscription(id: string) {
    _cache = (_cache ?? []).filter((s) => s.id !== id);
    notify();
    await persist(_cache);
  }

  return { subscriptions, addSubscription, updateSubscription, deleteSubscription, isLoading };
}

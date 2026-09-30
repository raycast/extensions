import { Cache } from "@raycast/api";
import { IFormData } from "../interfaces/interfaces";
import { useEffect, useState } from "react";

const TRIGGER_CACHE_LENGTH = 10;

export interface IAppHistoryReturn {
  isLoading: boolean | undefined;
  history: IFormData[];
  addTrigger: (triggerPayload: IFormData) => void;
  reload: () => void;
}

export default function useTriggerHistory(): IAppHistoryReturn {
  const [loading, setLoading] = useState<boolean | undefined>(true);
  const [triggers, setTriggers] = useState<IFormData[]>([]);
  const cache = new Cache();

  useEffect(() => {
    readTriggers();
  }, []);

  function addTrigger(triggerPayload: IFormData) {
    if (triggers.length > TRIGGER_CACHE_LENGTH - 1) {
      triggers.shift();
    }

    triggers.push(triggerPayload);
    setTriggers(triggers);
    cacheTriggers(triggers);
  }

  function readTriggers() {
    setLoading(undefined);
    setLoading(true);

    const cache = loadTriggers();
    setTriggers(cache);

    setLoading(undefined);
    setLoading(false);
  }

  const resTriggers = [...triggers].reverse();

  function cacheTriggers(triggers: IFormData[]): void {
    cache.set("recentTriggerEvents", JSON.stringify(triggers));
  }

  function loadTriggers(): IFormData[] {
    return JSON.parse(cache.get("recentTriggerEvents") ?? "[]") as IFormData[];
  }
  return {
    isLoading: loading,
    history: resTriggers,
    addTrigger,
    reload: readTriggers,
  };
}

import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getModelIds } from "../utils/model-response";
import { getConfiguration, useChatGPT } from "./useChatGPT";
import { useProxy } from "./useProxy";

export function useModelOptions() {
  const gpt = useChatGPT();
  const proxy = useProxy();
  const [httpAgent] = useState(proxy);
  const { useAzure } = getConfiguration();
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(!useAzure);

  useEffect(() => {
    if (useAzure) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    gpt.models
      .list({ httpAgent, signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setOptions(getModelIds(res.data, (res as unknown as { body: unknown }).body));
      })
      .catch(async (err: unknown) => {
        if (controller.signal.aborted) return;
        console.error(err);
        await showToast({
          title: "Could not load models",
          message: "You can still enter a model ID manually. Check your API endpoint and key.",
          style: Toast.Style.Failure,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [gpt, httpAgent, useAzure]);

  return { options, isLoading };
}

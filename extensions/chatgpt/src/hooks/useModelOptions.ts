import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { listCodexAppServerModels } from "../utils/codex-app-server";
import { resolveAuthStatus } from "../utils/auth";
import { normalizeAvailableOptions } from "../utils/model-support";
import { getModelIds } from "../utils/model-response";
import { useChatGPT } from "./useChatGPT";
import { getConfiguration } from "./useChatGPT";

export function useModelOptions() {
  const client = useChatGPT({ allowMissingApiKey: true });
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [didLoad, setDidLoad] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setDidLoad(false);
    const load = async () => {
      try {
        const auth = await resolveAuthStatus();
        const models =
          auth.provider === "apiKey" && client
            ? getConfiguration().useAzure
              ? [getConfiguration().azureDeployment].filter((value): value is string => !!value)
              : await client.models
                  .list({ signal, timeout: 5_000, maxRetries: 0 })
                  .then((res) => getModelIds(res.data, (res as unknown as { body: unknown }).body))
            : (await listCodexAppServerModels())
                .filter((model) => !model.hidden)
                .map((model) => model.model || model.id);
        if (!signal.aborted) {
          setOptions(normalizeAvailableOptions(models));
          setDidLoad(true);
        }
      } catch (error) {
        if (!signal.aborted) {
          setOptions([]);
          await showToast({
            title: "Could not load available models",
            message: String(error),
            style: Toast.Style.Failure,
          });
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [client]);

  return { options, isLoading, didLoad };
}

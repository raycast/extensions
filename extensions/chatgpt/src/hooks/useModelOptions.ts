import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { resolveAuthStatus } from "../utils/auth";
import { listCodexAppServerModels } from "../utils/codex-app-server";
import { getModelIds } from "../utils/model-response";
import { normalizeAvailableOptions } from "../utils/model-support";
import { getConfiguration, useChatGPT } from "./useChatGPT";

const noModels: string[] = [];

export function useModelOptions() {
  const client = useChatGPT({ allowMissingApiKey: true });
  const abortable = useRef<AbortController>(null);
  const { data, isLoading, error } = usePromise(
    async () => {
      const signal = abortable.current?.signal;
      const auth = await resolveAuthStatus();
      signal?.throwIfAborted();

      if (auth.provider === "chatgpt") {
        const models = await listCodexAppServerModels();
        return normalizeAvailableOptions(
          models.filter((model) => !model.hidden).map((model) => model.model || model.id),
        );
      }
      if (auth.provider !== "apiKey" || !client) return noModels;

      const { useAzure, azureDeployment } = getConfiguration();
      if (useAzure) return azureDeployment ? [azureDeployment] : noModels;

      const response = await client.models.list({ signal, timeout: 5_000, maxRetries: 0 });
      return normalizeAvailableOptions(getModelIds(response.data, (response as unknown as { body: unknown }).body));
    },
    [],
    {
      abortable,
      async onError(error) {
        await showFailureToast(error, { title: "Could not load available models" });
      },
    },
  );

  return { options: data ?? noModels, isLoading, didLoad: data !== undefined && !error };
}

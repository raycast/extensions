import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { listCodexAppServerModels } from "../utils/codex-app-server";
import { resolveAuthStatus } from "../utils/auth";
import { normalizeAvailableOptions } from "../utils/model-support";
import { useChatGPT } from "./useChatGPT";

export function useModelOptions() {
  const client = useChatGPT({ allowMissingApiKey: true });
  const [options, setOptions] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async () => {
      try {
        const auth = await resolveAuthStatus();
        const models =
          auth.provider === "apiKey" && client
            ? (await client.models.list()).data.map((model) => model.id)
            : (await listCodexAppServerModels())
                .filter((model) => !model.hidden)
                .map((model) => model.model || model.id);
        if (active) setOptions(normalizeAvailableOptions(models));
      } catch (error) {
        if (active) {
          setOptions([]);
          await showToast({
            title: "Could not load available models",
            message: String(error),
            style: Toast.Style.Failure,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [client]);

  return { options, isLoading };
}

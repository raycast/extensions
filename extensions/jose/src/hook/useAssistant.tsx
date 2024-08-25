import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import fetch from "node-fetch";
import { AssistantDefault, AssistantHookType } from "../type/assistant";
import { ClearPromptSystem, ConfigurationTypeCommunicationDefault, GetApiEndpointData } from "../type/config";
import { AssistantDefaultTemperature, ITalkAssistant } from "../ai/type";
import { RemoveDuplicatesByField } from "../common/list";

export function useAssistant(): AssistantHookType {
  const [data, setData] = useState<ITalkAssistant[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "assistants";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);
      if (stored) {
        setData((previous) => RemoveDuplicatesByField([...previous, ...JSON.parse(stored)], "assistantId"));
      } else {
        if (GetApiEndpointData() !== undefined && GetApiEndpointData().assistant !== undefined) {
          await apiLoad(setData, data);
        } else {
          setData(AssistantDefault);
        }
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      LocalStorage.setItem(localStorageName, JSON.stringify(RemoveDuplicatesByField(data, "assistantId")));
    }
  }, [data, isLoading]);

  const reload = useCallback(async () => {
    if (GetApiEndpointData() === undefined || GetApiEndpointData().assistant === undefined) {
      setData(AssistantDefault);
      return;
    }
    await apiLoad(setData, data);

    await showToast({
      title: "Assistant data realoaded!",
      style: Toast.Style.Success,
    });
  }, [setData, data]);

  const add = useCallback(
    async (item: ITalkAssistant) => {
      item.isLocal = true;
      const newData: ITalkAssistant = { ...item };
      setData([...data, newData]);

      await showToast({
        title: "Assistant saved!",
        style: Toast.Style.Success,
      });

      await LocalStorage.setItem("onboarding", "finish");
    },
    [setData, data]
  );

  const update = useCallback(
    async (item: ITalkAssistant) => {
      setData((prev) => {
        return prev.map((v: ITalkAssistant) => {
          if (v.assistantId === item.assistantId) {
            return item;
          }

          return v;
        });
      });

      await showToast({
        title: "Assistant updated!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (item: ITalkAssistant) => {
      if (item.isLocal !== true) {
        await showToast({
          title: "Removing your assistant imposible, assistant is not local",
          style: Toast.Style.Failure,
        });

        return;
      }

      const newData: ITalkAssistant[] = data.filter((o) => o.assistantId !== item.assistantId);
      setData(newData);

      await showToast({
        title: "Assistant removed!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    await showToast({
      title: "You can't cleared assistants!",
      style: Toast.Style.Failure,
    });
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, reload }),
    [data, isLoading, add, update, remove, clear, reload]
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiLoad(setData: any, oldData: ITalkAssistant[]) {
  if (GetApiEndpointData().assistant === "" || GetApiEndpointData().assistant === undefined) {
    return setData(AssistantDefault);
  }
  await fetch(GetApiEndpointData().assistant)
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRes: ITalkAssistant[] = res.map((item: any) => {
        const existing = oldData.find((x: ITalkAssistant) => x.assistantId === item.assistantId);
        return {
          ...item,
          promptSystem: ClearPromptSystem(item.promptSystem),
          modelApiKeyOrUrl: undefined,
          webhookUrl: existing?.webhookUrl || item.webhookUrl,
          modelTemperature: existing?.modelTemperature || AssistantDefaultTemperature,
          typeCommunication: existing?.typeCommunication || ConfigurationTypeCommunicationDefault,
          isLocal: false,
        };
      });

      setData(newRes);
    })
    .catch((error) => {
      console.error(error);
    });
}

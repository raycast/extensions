import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import fetch from "node-fetch";
import { AssistantDefault, AssistantDefaultTemperature, AssistantHookType } from "../type/assistant";
import {
  ClearPromptSystem,
  ConfigurationTypeCommunicationDefault,
  GetApiEndpointData,
  GetDevice,
  GetUserName,
} from "../type/config";
import { TalkAssistantType } from "../type/talk";

export function useAssistant(): AssistantHookType {
  const [data, setData] = useState<TalkAssistantType[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "assistants";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);
      if (stored) {
        setData((previous) => [...previous, ...JSON.parse(stored)]);
      } else {
        if (GetApiEndpointData() !== "") {
          await apiLoad(setData, data);
        } else {
          setData([AssistantDefault]);
        }
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem(localStorageName, JSON.stringify(data));
  }, [data]);

  const reload = useCallback(async () => {
    await apiLoad(setData, data);

    await showToast({
      title: "Assistant data realoaded!",
      style: Toast.Style.Success,
    });
  }, [setData, data]);

  const add = useCallback(
    async (item: TalkAssistantType) => {
      item.isLocal = true;
      const newData: TalkAssistantType = { ...item };
      setData([...data, newData]);

      await showToast({
        title: "Assistant saved!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const update = useCallback(
    async (item: TalkAssistantType) => {
      setData((prev) => {
        return prev.map((v: TalkAssistantType) => {
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
    async (item: TalkAssistantType) => {
      if (item.isLocal !== true) {
        await showToast({
          title: "Removing your assistant imposible, assistant is not local",
          style: Toast.Style.Failure,
        });

        return;
      }

      const newData: TalkAssistantType[] = data.filter((o) => o.assistantId !== item.assistantId);
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
async function apiLoad(setData: any, oldData: TalkAssistantType[]) {
  await fetch(GetApiEndpointData(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: GetUserName(),
      device: GetDevice(),
      dataType: "assistants",
    }),
  })
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRes: TalkAssistantType[] = res.map((item: any) => {
        const existing = oldData.find((x: TalkAssistantType) => x.assistantId === item.assistantId);
        return {
          ...item,
          promptSystem: ClearPromptSystem(item.promptSystem),
          webhookUrl: existing?.webhookUrl || item.webhookUrl,
          modelTemperature: existing?.modelTemperature || AssistantDefaultTemperature,
          typeCommunication: existing?.typeCommunication || ConfigurationTypeCommunicationDefault,
          isLocal: false,
        };
      });

      setData(newRes);
    })
    .catch((err) => {
      console.log(err);
    });
}

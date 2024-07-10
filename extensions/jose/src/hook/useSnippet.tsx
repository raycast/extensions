import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import fetch from "node-fetch";
import { SnippetDefault, SnippetDefaultTemperature, SnippetHookType } from "../type/snippet";
import {
  ClearPromptSystem,
  ConfigurationTypeCommunicationDefault,
  GetApiEndpointData,
  GetDevice,
  GetUserName,
} from "../type/config";
import { TalkSnippetType } from "../type/talk";

export function useSnippet(): SnippetHookType {
  const [data, setData] = useState<TalkSnippetType[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "snippets";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);
      if (stored) {
        setData((previous) => [...previous, ...JSON.parse(stored)]);
      } else {
        if (GetApiEndpointData() !== undefined) {
          await apiLoad(setData, data);
        } else {
          setData(SnippetDefault);
        }
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem(localStorageName, JSON.stringify(data));
  }, [data]);

  const reload = useCallback(async () => {
    if (GetApiEndpointData() === undefined) {
      return;
    }
    await apiLoad(setData, data);

    await showToast({
      title: "Assistant data realoaded!",
      style: Toast.Style.Success,
    });
  }, [setData, data]);

  const add = useCallback(
    async (item: TalkSnippetType) => {
      item.isLocal = true;
      const newData: TalkSnippetType = { ...item };
      setData([...data, newData]);

      await showToast({
        title: "Snippet saved!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const update = useCallback(
    async (item: TalkSnippetType) => {
      setData((prev) => {
        return prev.map((v: TalkSnippetType) => {
          if (v.snippetId === item.snippetId) {
            return item;
          }

          return v;
        });
      });

      await showToast({
        title: "Snippet updated!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (item: TalkSnippetType) => {
      if (item.isLocal !== true) {
        await showToast({
          title: "Removing your Snippet imposible, Snippet is not local",
          style: Toast.Style.Failure,
        });

        return;
      }

      const newData: TalkSnippetType[] = data.filter((o) => o.snippetId !== item.snippetId);
      setData(newData);

      await showToast({
        title: "Snippet removed!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    await showToast({
      title: "You can't cleared Snippets!",
      style: Toast.Style.Failure,
    });
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, reload }),
    [data, isLoading, add, update, remove, clear, reload]
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiLoad(setData: any, oldData: TalkSnippetType[]) {
  await fetch(GetApiEndpointData().host, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: GetUserName(),
      device: GetDevice(),
      dataType: "snippets",
    }),
  })
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRes: TalkSnippetType[] = res.map((item: any) => {
        const existing = oldData.find((x: TalkSnippetType) => x.snippetId === item.snippetId);
        return {
          ...item,
          promptSystem: ClearPromptSystem(item.promptSystem),
          webhookUrl: existing?.webhookUrl || item.webhookUrl,
          modelTemperature: existing?.modelTemperature || SnippetDefaultTemperature,
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

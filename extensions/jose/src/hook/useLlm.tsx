import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import fetch from "node-fetch";
import { LlmDefault, LlmHookType } from "../type/llm";
import { GetApiEndpointData } from "../type/config";
import { ITalkLlm } from "../ai/type";
import { RemoveDuplicatesByField } from "../common/list";

export function useLlm(): LlmHookType {
  const [data, setData] = useState<ITalkLlm[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const localStorageName = "llms";

  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>(localStorageName);
      if (stored) {
        setData((previous) => RemoveDuplicatesByField([...previous, ...JSON.parse(stored)], "key"));
      } else {
        if (GetApiEndpointData() !== undefined && GetApiEndpointData().llm !== undefined) {
          await apiLoad(setData);
        } else {
          setData(LlmDefault);
        }
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      LocalStorage.setItem(localStorageName, JSON.stringify(RemoveDuplicatesByField(data, "key")));
    }
  }, [data, isLoading]);

  const reload = useCallback(async () => {
    if (GetApiEndpointData() === undefined || GetApiEndpointData().llm === undefined) {
      setData(LlmDefault);
      return;
    }
    await apiLoad(setData);

    await showToast({
      title: "LLM data realoaded!",
      style: Toast.Style.Success,
    });
  }, [setData, data]);

  const add = useCallback(
    async (item: ITalkLlm) => {
      item.isLocal = true;
      const newData: ITalkLlm = { ...item };
      setData([...data, newData]);

      await showToast({
        title: "Llm saved!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const update = useCallback(
    async (item: ITalkLlm) => {
      setData((prev) => {
        return prev.map((v: ITalkLlm) => {
          if (v.key === item.key) {
            return item;
          }

          return v;
        });
      });

      await showToast({
        title: "Llm updated!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (item: ITalkLlm) => {
      if (item.isLocal !== true) {
        await showToast({
          title: "Removing your Llm imposible, Llm is not local",
          style: Toast.Style.Failure,
        });

        return;
      }

      const newData: ITalkLlm[] = data.filter((o) => o.key !== item.key);
      setData(newData);

      await showToast({
        title: "Llm removed!",
        style: Toast.Style.Success,
      });
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    await showToast({
      title: "You can't cleared Llms!",
      style: Toast.Style.Failure,
    });
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear, reload }),
    [data, isLoading, add, update, remove, clear, reload]
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiLoad(setData: any) {
  if (GetApiEndpointData().llm === "" || GetApiEndpointData().llm === undefined) {
    return setData(LlmDefault);
  }
  await fetch(GetApiEndpointData().llm)
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRes: ITalkLlm[] = res.map((item: any) => {
        return {
          ...item,
          isLocal: false,
        };
      });

      setData(newRes);
    })
    .catch((error) => {
      console.error(error);
    });
}

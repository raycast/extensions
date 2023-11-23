import { ModelTemplateHook, TemplateModel } from "../type";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChatGo } from "./useChatGo";

export const DEFAULT_TEMPLATE_MODE: TemplateModel = {
  id: 105,
  user_id: 44,
  template_id: 0,
  template_name: "万能助手",
  type: 0,
  description: "",
  content: "你是一个很有帮助的AI助手",
  tags: [],
  avatar: "",
  temperature: 0.75,
  is_context: false,
  priority: 1000000,
  create_time: "2023-04-09T09:05:31.000Z",
  update_time: "2023-04-09T09:05:31.000Z",
};

export function useMyTemplateModel(): ModelTemplateHook {
  const [data, setData] = useState<TemplateModel[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const chatGo = useChatGo();

  useEffect(() => {
    chatGo
      .getMyTemplateList()
      .then((res) => {
        setData(res || [DEFAULT_TEMPLATE_MODE]);
        setLoading(false);
      })
      .catch((err) => {
        setData([DEFAULT_TEMPLATE_MODE]);
        setLoading(false);
        console.log("useModel getMyTemplateList err", err);
      });
  }, []);

  const add = useCallback(async () => {
    //
  }, []);
  const update = useCallback(async () => {
    //
  }, []);
  const remove = useCallback(async () => {
    //
  }, []);
  const clear = useCallback(async () => {
    //
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear]
  );
}

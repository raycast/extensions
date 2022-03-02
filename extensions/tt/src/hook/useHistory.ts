import { useCallback, useEffect, useState } from "react";
import { get, set } from "../util/storage";
import { StorageKey } from "../constnat";
import { showToast, Toast } from "@raycast/api";

export const useHistory = (text: string) => {
  const [histories, setHistories] = useState<string[]>([]);
  const onSave = useCallback(() => {
    get<string[]>(StorageKey.words, [])
      .then((words) => [text, ...words])
      .then((values) => set(StorageKey.words, values))
      .then(() => get<string[]>(StorageKey.words, []))
      .then(setHistories)
      .catch(() => {
        return showToast({
          style: Toast.Style.Failure,
          title: "저장 실패",
        });
      });
  }, [text]);
  const onDelete = useCallback((text) => {
    get<string[]>(StorageKey.words, [])
      .then((words) => {
        const index = words.indexOf(text);
        if (index !== -1) {
          return [...words.splice(0, index), ...words.splice(index + 1, words.length - 1)];
        }

        return words;
      })
      .then((words) => set(StorageKey.words, words))
      .then(() => get<string[]>(StorageKey.words, []))
      .then(setHistories);
  }, []);

  useEffect(() => {
    get(StorageKey.words, []).then(setHistories);
  }, [setHistories]);

  return {
    histories,
    onSave,
    onDelete,
  };
};

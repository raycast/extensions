import { useCallback, useEffect, useState } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";

export const useConfigure = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState({} as State);
  const onSubmit = useCallback((values: typeof ID_PALCEHOLDER_PAIR) => {
    const entries = Object.entries(values);
    const invalidIdList = entries
      .filter(([id, value]) => {
        if (value.length === 0) {
          return false;
        }
        return value.length !== ID_PALCEHOLDER_PAIR[id as keyof typeof ID_PALCEHOLDER_PAIR].length;
      })
      .map(([id]) => {
        return id;
      });
    if (invalidIdList.length > 0) {
      return showToast({
        style: Toast.Style.Failure,
        title: "잘못된 입력",
        message: invalidIdList.join("\n"),
      });
    }

    return Promise.all(
      entries.map(([id, value]) => {
        LocalStorage.setItem(id, value);
      })
    )
      .then(() => {
        return showToast({
          style: Toast.Style.Success,
          title: "저장됨",
        });
      })
      .catch((e) => {
        return showToast({
          style: Toast.Style.Failure,
          title: "실패",
          message: e.message,
        });
      });
  }, []);

  useEffect(() => {
    const entries = Object.keys(ID_PALCEHOLDER_PAIR);

    Promise.all(
      entries.map((id) => {
        return LocalStorage.getItem(id).then((value) => [id, value]);
      })
    )
      .then((pairs) => {
        const initialState = pairs.reduce((acc, [id, value]) => {
          acc[id as keyof typeof ID_PALCEHOLDER_PAIR] = value as string;
          return acc;
        }, {} as State);

        setState(initialState);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return {
    isLoading,
    state,
    onSubmit,
  };
};

const ID_PALCEHOLDER_PAIR = {
  "X-Naver-Client-Id": "xxxxxxxxxxxxxxxxxxxx",
  "X-Naver-Client-Secret": "xxxxxxxxxx",
};

type State = { [key in keyof typeof ID_PALCEHOLDER_PAIR | string]?: string };

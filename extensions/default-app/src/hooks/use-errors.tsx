import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { Prettify } from "../types/prettify";

export function useErrors<
  T extends string,
  M extends Prettify<Partial<Record<T, string>>> = Prettify<Partial<Record<T, string>>>,
>(initialErrors?: M) {
  const [errors, setErrorsInternal] = useState<M>(initialErrors ?? ({} as M));

  const setErrors: Dispatch<SetStateAction<M>> = useCallback(
    (update) => {
      setErrorsInternal((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        return {
          ...prev,
          ...next,
        };
      });
    },
    [setErrorsInternal],
  );

  const clearErrors = useCallback(
    (id?: T) => {
      setErrorsInternal((prev) => {
        if (id) {
          return { ...prev, [id]: undefined };
        }
        return {} as M;
      });
    },
    [setErrorsInternal],
  );

  return {
    errors,
    setErrors,
    clearErrors,
  };
}

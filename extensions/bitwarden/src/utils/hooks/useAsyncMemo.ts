import { DependencyList, useEffect, useState } from "react";

export function useAsyncMemo<T>(factory: () => Promise<T> | undefined | null, deps: DependencyList): T | undefined;
export function useAsyncMemo<T>(factory: () => Promise<T> | undefined | null, deps: DependencyList, initial: T): T;
export function useAsyncMemo<T>(factory: () => Promise<T> | undefined | null, deps: DependencyList, initial?: T) {
  const [value, setValue] = useState<T | undefined>(initial);

  useEffect(() => {
    let cancel = false;
    const promise = factory();
    if (promise != null) {
      void promise.then((val) => {
        if (!cancel) setValue(val);
      });
    }

    return () => {
      cancel = true;
    };
  }, deps);

  return value;
}

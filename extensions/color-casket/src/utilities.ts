import { open } from "@raycast/api";
import { useEffect } from "react";

export function returnToRaycast() {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      open("raycast://");
      resolve();
    }, 100);
  });
}

export function asyncEffect<T>(action: Promise<T>, callback: (state: T) => void) {
  useEffect(() => {
    let cancel = false;
    action.then((state) => {
      if (!cancel) {
        callback(state);
      }
    });

    return () => {
      cancel = true;
    };
  }, []);
}

export function debounce<A = unknown, R = void>(fn: (args: A) => R, ms: number): [(args: A) => Promise<R>, () => void] {
  let timer: NodeJS.Timeout;

  const debounce = (args: A): Promise<R> =>
    new Promise((resolve) => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        resolve(fn(args));
      }, ms);
    });

  const teardown = () => clearTimeout(timer);

  return [debounce, teardown];
}

export function useDebounce<A = unknown, R = void>(fn: (args: A) => R, ms: number): (args: A) => Promise<R> {
  const [debouncedFun, teardown] = debounce<A, R>(fn, ms);

  useEffect(() => () => teardown(), []);

  return debouncedFun;
}

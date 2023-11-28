/* eslint-disable @typescript-eslint/no-explicit-any -- we should allow `any` as the network response, otherwise we're getting into @tanstack/query territory and it gets complicated fast */

import { Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { CACHE_PREFIX, zeroDate } from "./cache";
import { getHeaders } from "./auth";
import { useEffect, useState, useRef } from "react";
import fetch from "node-fetch";

/**
 * This function returns `a` if `b` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between JSON values for example.
 *
 * Function taken from {@link https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts}
 */
function replaceEqualDeep<T>(a: unknown, b: T): T;
function replaceEqualDeep(a: any, b: any): any {
  if (a === b) {
    return a;
  }

  const array = isPlainArray(a) && isPlainArray(b);

  if (array || (isPlainObject(a) && isPlainObject(b))) {
    const aSize = array ? a.length : Object.keys(a).length;
    const bItems = array ? b : Object.keys(b);
    const bSize = bItems.length;
    const copy: any = array ? [] : {};

    let equalItems = 0;

    for (let i = 0; i < bSize; i++) {
      const key = array ? i : bItems[i];
      copy[key] = replaceEqualDeep(a[key], b[key]);
      if (copy[key] === a[key]) {
        equalItems++;
      }
    }

    return aSize === bSize && equalItems === aSize ? a : copy;
  }

  return b;
}

function isPlainArray(value: unknown) {
  return Array.isArray(value) && value.length === Object.keys(value).length;
}

/** Copied from {@link https://github.com/jonschlinkert/is-plain-object} */
function isPlainObject(o: any): o is object {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has no constructor
  const ctor = o.constructor;
  if (typeof ctor === "undefined") {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  // eslint-disable-next-line no-prototype-builtins -- we're not modifying it, just checking
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

function hasObjectPrototype(o: any): boolean {
  return Object.prototype.toString.call(o) === "[object Object]";
}

const defaultSelect = (data: any) => data.data;

export function useTwitchRequest<T>({
  url,
  cacheKey,
  initialData,
  cacheDuration = 60_000,
  enabled = true,
  select = defaultSelect,
  loadingWhileStale = false,
}: {
  url: string;
  cacheKey: string;
  initialData: T;
  cacheDuration?: number;
  enabled?: boolean;
  select?: (data: any) => T;
  loadingWhileStale?: boolean;
}) {
  const [_updatedAt, setUpdatedAt] = useCachedState<string>(`${CACHE_PREFIX}_${cacheKey}_updated_at`, zeroDate);
  const updatedAt = Number(_updatedAt);
  const [previous, setPrevious] = useCachedState<T | undefined>(`${CACHE_PREFIX}_${cacheKey}`, undefined);
  const [isLoading, setIsLoading] = useState(loadingWhileStale ? true : previous === undefined);
  const prevRef = useRef(previous);
  prevRef.current = previous;

  useEffect(() => {
    if (!enabled) return;
    if (updatedAt + cacheDuration >= Date.now()) return;
    const controller = new AbortController();
    if (!loadingWhileStale) {
      setIsLoading(previous === undefined);
    }
    getHeaders()
      .then((headers) => fetch(url, { headers, signal: controller.signal }))
      .then((response) => response.json())
      .then((data: any) => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
        if (data && data.data) {
          const next = select(data);
          const replaced = replaceEqualDeep(prevRef.current, next);
          if (replaced === prevRef.current) return;
          setPrevious(replaced);
          setUpdatedAt(String(Date.now()));
          return;
        }
        if (data.message) {
          showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
        }
        const replaced = replaceEqualDeep(prevRef.current, initialData);
        if (replaced === initialData) return;
        setPrevious(replaced);
        setUpdatedAt(String(Date.now()));
      })
      .catch();
    // return () => controller.abort()
  }, [enabled, cacheDuration, url]);

  return {
    data: previous ?? initialData,
    isLoading,
    updatedAt,
  };
}

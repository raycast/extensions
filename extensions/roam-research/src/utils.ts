import { useRef, useCallback } from "react";
import dayjs from "dayjs";
import { ReversePullBlock } from "./type";

export const CONSTANTS = {
  keys: {
    graph: "graph-key",
    "graph-name": (name: string) => "graph-key-" + name,
  },
};

export const keys = <T extends object>(obj: T) => {
  return Object.keys(obj) as (keyof T)[];
};

export const debounce = <T, D>(cb: (...args: T[]) => D) => {
  let timer: any;
  return (...args: T[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      cb(...args);
      timer = null;
    }, 500);
  };
};

export const useEvent = <T, D>(cb: (...atgs: T[]) => D) => {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  return useCallback((...args: T[]) => {
    return cbRef.current(...args);
  }, []);
};

export const timeformatFromMs = (n?: number) => {
  return dayjs(n).format("HH:mm:ss YYYY-MM-DD");
};

export const detailMarkdown = (block: ReversePullBlock) => {
  const strs: string[] = [];
  let ary = block?.[":block/_children"];
  console.log(JSON.stringify(block));
  while (ary && ary.length) {
    const b = ary[0];
    console.log(b, " = b");
    strs.unshift(b[":block/string"] || b[":node/title"] || "");
    ary = b[":block/_children"];
    console.log(ary, "----", b[":block/_children"], strs);
  }
  return `${strs.join("  >  ")}\n\n---
${block[":block/string"] || block[":node/title"] || ""}

                `;
};

export const todayUid = () => {
  return dayjs().format("MM-DD-YYYY");
};

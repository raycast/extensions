import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "url";

export interface Package {
  name?: string;
  url?: string;
}

export interface Module {
  name?: string;
  url?: string;
}

export interface Result {
  item: string;
  docs: string;
  type: string;
  package: Package;
  module: Module;
  url: string;
}

export const useHoogle = (q: string) => {
  const params = new URLSearchParams();
  params.append("hoogle", q);
  params.append("mode", "json");
  return useFetch<Result[]>(`https://hoogle.haskell.org?${params.toString()}`, { execute: q != "" });
};

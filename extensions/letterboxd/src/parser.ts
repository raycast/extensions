import type { Element } from "domhandler";
import { load } from "cheerio";

export const parse = <M extends ExtractMap>(
  html: string,
  extractionTemplate: M,
): ExtractedMap<M> => {
  return load(html)("body").extract(extractionTemplate) as ExtractedMap<M>;
};

export type ExtractDescriptorFn = (
  el: Element,
  key: string,
  obj: Record<string, unknown>,
) => unknown;

export interface ExtractDescriptor {
  selector: string;
  value?: string | ExtractDescriptorFn | ExtractMap;
}

type ExtractValue = string | ExtractDescriptor | [string | ExtractDescriptor];

export interface ExtractMap {
  [key: string]: ExtractValue;
}

type ExtractedValue<V extends ExtractValue, M extends ExtractMap> = V extends [
  string | ExtractDescriptor,
]
  ? NonNullable<ExtractedValue<V[0], M>>[]
  : V extends string
    ? string | undefined
    : V extends ExtractDescriptor
      ? V["value"] extends ExtractMap
        ? ExtractedMap<V["value"]> | undefined
        : V["value"] extends ExtractDescriptorFn
          ? ReturnType<V["value"]> | undefined
          : string | undefined
      : never;

export type ExtractedMap<M extends ExtractMap> = {
  [key in keyof M]: ExtractedValue<M[key], M>;
};

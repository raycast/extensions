import type { AnyNode, Cheerio, Element } from "cheerio";
import { load } from "cheerio";
import type { prop } from "cheerio/lib/api/attributes";

export const parse = <M extends ExtractMap>(
  html: string,
  extractionTemplate: M,
): ExtractedMap<M> => {
  const $ = load(html);
  const result = extract($("body"), extractionTemplate);
  return result;
};

/* everything below ported from cheerio source
 * The logic is ported from the Cheerio's github repo as the latest public release does not include the extract function
 * https://github.com/cheeriojs/cheerio/blob/main/src/api/extract.ts
 */

export type ExtractDescriptorFn = (
  el: Element,
  key: string,
  // TODO: This could be typed with ExtractedMap
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
          : ReturnType<typeof prop> | undefined
      : never;

export type ExtractedMap<M extends ExtractMap> = {
  [key in keyof M]: ExtractedValue<M[key], M>;
};

function getExtractDescr(
  descr: string | ExtractDescriptor,
): Required<ExtractDescriptor> {
  if (typeof descr === "string") {
    return { selector: descr, value: "textContent" };
  }

  return {
    selector: descr.selector,
    value: descr.value ?? "textContent",
  };
}

/**
 * Extract multiple values from a document, and store them in an object.
 * @param cheerioObject
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
const extract = <M extends ExtractMap, T extends AnyNode>(
  _this: Cheerio<T>,
  map: M,
): ExtractedMap<M> => {
  const ret: Record<string, unknown> = {};

  for (const key in map) {
    const descr = map[key];
    const isArray = Array.isArray(descr);

    const { selector, value } = getExtractDescr(isArray ? descr[0] : descr);

    const fn: ExtractDescriptorFn =
      typeof value === "function"
        ? value
        : typeof value === "string"
          ? (el: Element) => _this._make(el).prop(value)
          : (el: Element) => extract(_this._make(el), value);

    if (isArray) {
      ret[key] = _this
        .find(selector)
        .map((_, el) => fn(el, key, ret))
        .get();
    } else {
      const $ = _this.find(selector);
      ret[key] = $.length > 0 ? fn($[0], key, ret) : undefined;
    }
  }

  return ret as ExtractedMap<M>;
};

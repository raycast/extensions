import type { AnyNode, Cheerio, Element } from "cheerio";
import type { prop } from "cheerio/lib/api/attributes";
import { load } from "cheerio";

type ExtractValue = ExtractDescriptor | ExtractDescriptor[];

export interface ExtractMap {
  [key: string]: ExtractValue;
}

interface ExtractDescriptor {
  selector: string;
  value?: string | ExtractMap;
}

type ExtractedValue<T extends ExtractValue, M extends ExtractMap> = T extends ExtractDescriptor[]
  ? NonNullable<ExtractedValue<T[0], M>>[]
  : T extends ExtractDescriptor
  ? T["value"] extends ExtractMap
    ? ExtractedMap<T["value"]>
    : T["value"] extends string
    ? ReturnType<typeof prop>
    : string
  : unknown;

type ExtractedMap<M extends ExtractMap> = {
  [K in keyof M]: ExtractedValue<M[K], M>;
};

function getExtractDescriptor(descriptor: string | ExtractDescriptor): Required<ExtractDescriptor> {
  if (typeof descriptor === "string") {
    return { selector: descriptor, value: "textContent" };
  }

  return {
    selector: descriptor.selector,
    value: descriptor.value ?? "textContent",
  };
}

export const parse = <M extends ExtractMap>(extractionTemplate: M, html: string): ExtractedMap<M> => {
  const $ = load(html);
  const result = extract(extractionTemplate, $("body"));
  return result;
};

/**
 * Extracts data from a cheerio object using an extraction template
 * The logic is ported from the Cheerio's github repo as the latest public release does not include the extract function
 * @param extractionTemplate
 * @param cheerioObject
 * @returns
 */
const extract = <M extends ExtractMap, T extends AnyNode>(
  extractionTemplate: M,
  cheerioObject: Cheerio<T>
): ExtractedMap<M> => {
  const result: Record<string, unknown> = {};

  // iterate through the extraction template
  for (const [key, descriptor] of Object.entries(extractionTemplate)) {
    const isDescriptorArray = Array.isArray(descriptor);
    const { selector, value } = getExtractDescriptor(isDescriptorArray ? descriptor[0] : descriptor);

    let extractorFunction: (element: Cheerio<Element>) => unknown = () => null;
    if (typeof value === "string") {
      extractorFunction = (element: Cheerio<Element>) => element.prop(value);
    } else if (typeof value === "object") {
      extractorFunction = (element: Cheerio<Element>) => extract(value, element);
    }

    if (isDescriptorArray) {
      result[key] = cheerioObject
        .find(selector)
        .map((_, el) => extractorFunction(cheerioObject._make(el)))
        .get();
    } else {
      const $ = cheerioObject.find(selector);
      result[key] = extractorFunction($);
    }
  }

  return result as ExtractedMap<M>;
};

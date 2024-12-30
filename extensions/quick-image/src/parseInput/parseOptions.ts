import type { Operation } from "#/types";
import { zipObject, mapValues, defaults, difference } from "lodash";

// Given
//  optionText: 'a10,a11 key10:s10 option10:s10,s11'
//  format: 'arg10=a10,arg11=a11 key10:s10 option10:str10=s10,str11=s11'
//  outputs: { 0: { arg10: a10, arg11: a11 }, key10: s10, option10: { str10: s10, str11: s11 } }
export function parseOptions(optionText = "", format?: string) {
  if (!format) {
    return {};
  }
  const rawOptions = optionText ? parseOptionText(optionText) : {};
  // rawFormats: { 0: ['arg10=a10'], key10: ['s10'], option10: ['str10=s10']}
  const rawFormats = parseOptionText(format);
  const unknownKeys = difference(Object.keys(rawOptions), Object.keys(rawFormats));
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown keys '${unknownKeys.join(", ")}' in '${optionText}' for '${format}'`);
  }
  const options = mapValues(rawFormats, (formats, name) => {
    const values = rawOptions[name];
    if (formats[0].match(/=/)) {
      const defaultObj: Record<string, string> = Object.fromEntries(formats.map((format) => format.split("=")));
      const names = Object.keys(defaultObj);
      const valueObj = zipObject(names, values);
      return defaults(valueObj, defaultObj);
    } else {
      return values?.[0] || formats[0];
    }
  }) as Operation.Options;
  return options;
}

function parseOptionText(optionText: string) {
  const options: Record<string | number, string[]> = {};
  const segments = optionText.split(/ +/);
  for (const [index, segment] of segments.entries()) {
    if (segment.match(/:/)) {
      const [name, valueText] = segment.split(/:/);
      const values = valueText.split(/,/);
      options[name] = values;
    } else {
      const values = segment.split(/,/);
      options[index] = values;
    }
  }
  return options;
}

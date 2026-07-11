import { getValue } from "./get-value";
import { textWidth, textWidthWide } from "../constants";

export const displayValue = (value: string | number, key?: string, showToken?: boolean, maxChars?: number) => {
  const ret = getValue(value, key);
  const chars = (maxChars ?? (showToken ? textWidth : textWidthWide)) - (key ? key.length + 2 : 0);
  if (ret.length > chars) {
    return ret.substring(0, chars - 1) + "…";
  }
  return ret;
};

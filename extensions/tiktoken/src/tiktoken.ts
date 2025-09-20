import { getEncoding } from "js-tiktoken";
import { getPreferenceValues } from "@raycast/api";

export function encode(str: string) {
  return {
    tokens: getEncoder().encode(str),
    encoding: getUserEncoding(),
  };
}

export function decode(list: number[]) {
  return {
    text: getEncoder().decode(list),
    encoding: getUserEncoding(),
  };
}

function getEncoder() {
  return getEncoding(getUserEncoding());
}

function getUserEncoding() {
  return getPreferenceValues().encoding;
}

import { useEffect, useReducer } from "react";
import {
  asciiToNative,
  base64ToNative,
  decimalToNative,
  entityToNative,
  hexToNative,
  nativeToAscii,
  nativeToBase64,
  nativeToDecimal,
  nativeToEntity,
  nativeToHex,
  nativeToUnicode,
  nativeToUrl,
  nativeToUtf8,
  unicodeToNative,
  urlToNative,
  utf8ToNative,
} from "../utils/code-converter-utils";
import { autoPaste } from "../types/preferences";
import { Clipboard } from "@raycast/api";

const conversions = [
  ["unicode", unicodeToNative, nativeToUnicode],
  ["ascii", asciiToNative, nativeToAscii],
  ["hex", hexToNative, nativeToHex],
  ["decimal", decimalToNative, nativeToDecimal],
  ["utf8", utf8ToNative, nativeToUtf8],
  ["entity", entityToNative, nativeToEntity],
  ["base64", base64ToNative, nativeToBase64],
  ["url", urlToNative, nativeToUrl],
] as const;

export type CodeType = (typeof conversions)[number][0] | "native";

export type CodeConverter = {
  get: (type: CodeType) => string;
  set: (type: CodeType, value: string) => void;
  reset: () => void;
};

type State = {
  [key in CodeType]: string;
};
type Action =
  | {
      type: CodeType;
      value: string;
    }
  | { type: "reset" };

function getInitial() {
  const val = { native: "" } as State;
  for (const [type] of conversions) {
    val[type] = "";
  }
  return val;
}

function reducer(state: State, action: Action): State {
  if (action.type == "reset") return getInitial();

  const newState = { [action.type]: action.value } as State;
  if (action.type != "native") {
    let toNativeConverter;
    for (const [type, toNative] of conversions) {
      if (type == action.type) toNativeConverter = toNative;
    }
    newState["native"] = (toNativeConverter as (s: string) => string)(action.value);
  }
  const native = newState["native"];
  for (const [type, _, fromNative] of conversions) {
    if (type != action.type) {
      newState[type] = fromNative(native);
    }
  }
  return newState;
}

export default function useCodeConverter(): CodeConverter {
  const [state, dispatch] = useReducer(reducer, null, getInitial);

  useEffect(() => {
    if (autoPaste) {
      Clipboard.readText().then((text) => (text ? set("native", text) : null));
    }
  }, []);

  const get = (type: CodeType) => state[type];

  const set = (type: CodeType, value: string) => dispatch({ type, value });

  const reset = () => dispatch({ type: "reset" });

  return { get, set, reset };
}

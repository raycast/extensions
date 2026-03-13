import { MutableRefObject, useEffect, useRef, useState } from "react";
import { parseBigInt } from "../utils/common-utils";
import { autoPaste } from "../types/preferences";
import { Clipboard, Form } from "@raycast/api";
import { setConverterAuto } from "../utils/base-converter-utils";

export type InputsFocusRef = {
  2: Form.TextField;
  8: Form.TextField;
  10: Form.TextField;
  16: Form.TextField;
  32: Form.TextField;
  36?: { focus: () => void }; // in that case custom base needs to be set
};

export type BaseConverter = {
  get: (base: number, id?: number) => string;
  set: (base: number, value: string, allowedPrefix?: string, id?: number) => void;
  reset: () => void;
  ref: MutableRefObject<InputsFocusRef>;
};

type Override = { base: number; value: string; id: number };

export default function useBaseConverter(): BaseConverter {
  const [value, setValue] = useState<null | bigint>(null);
  const [override, setOverride] = useState<null | Override>(null);
  const ref = useRef<InputsFocusRef>({} as InputsFocusRef); // remember to assign ref 36

  useEffect(() => {
    if (autoPaste) {
      Clipboard.readText().then((text) => {
        if (text) {
          setConverterAuto((base, value, allowedPrefix, id) => {
            if (ref.current[base]) {
              // advanced view enabled
              set(base, value, allowedPrefix, id);
              ref.current[base].focus();
            } else {
              // advanced view disabled
              set(10, value, allowedPrefix, id);
              ref.current[10].focus();
            }
          }, text);
        }
      });
    }
  }, []);

  // `id` distinguishes different input fields with the same base.
  // This is useful when, in advanced view, user selects e.g. base 10
  // and inputs invalid value. In that case we don't want to display invalid
  // value in simple view base 10 input, so we give them different ids.

  const get = (base: number, id: number = 0): string => {
    if (override !== null && override.base == base && override.id == id) {
      return override.value;
    }
    return value?.toString(base) ?? "";
  };

  const set = (base: number, value: string, allowedPrefix?: string, id: number = 0) => {
    setOverride({ base, value, id });
    value = value.trim();
    if (allowedPrefix && value.startsWith(allowedPrefix)) {
      value = value.substring(allowedPrefix.length);
    }
    setValue(parseBigInt(value, base));
  };

  const reset = () => {
    setValue(null);
    setOverride(null);
  };

  return { get, set, reset, ref };
}

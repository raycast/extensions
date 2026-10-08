import { Form } from "@raycast/api";
import { BaseConverter, InputsFocusRef } from "../hooks/use-base-converter";
import { MutableRefObject } from "react";

export function BaseConvertersSimpleView({
  converter,
  inputRefs,
  setFocused,
}: {
  converter: BaseConverter;
  inputRefs: MutableRefObject<InputsFocusRef>;
  setFocused: (v: { base: number; id: number }) => void;
}) {
  return (
    <>
      <Form.TextField
        id="base10"
        title="10"
        value={converter.get(10)}
        onChange={(v) => converter.set(10, v)}
        ref={(r) => (inputRefs.current[10] = r!)}
        onFocus={() => setFocused({ base: 10, id: 0 })}
      />
      <Form.TextField
        id="base2"
        title="2"
        value={converter.get(2)}
        onChange={(v) => converter.set(2, v, "0b")}
        ref={(r) => (inputRefs.current[2] = r!)}
        onFocus={() => setFocused({ base: 2, id: 0 })}
      />
      <Form.TextField
        id="base4"
        title="4"
        value={converter.get(4)}
        onChange={(v) => converter.set(4, v)}
        onFocus={() => setFocused({ base: 4, id: 0 })}
      />
      <Form.TextField
        id="base8"
        title="8"
        value={converter.get(8)}
        onChange={(v) => converter.set(8, v, "0o")}
        ref={(r) => (inputRefs.current[8] = r!)}
        onFocus={() => setFocused({ base: 8, id: 0 })}
      />
      <Form.TextField
        id="base16"
        title="16"
        value={converter.get(16)}
        onChange={(v) => converter.set(16, v, "0x")}
        ref={(r) => (inputRefs.current[16] = r!)}
        onFocus={() => setFocused({ base: 16, id: 0 })}
      />
      <Form.TextField
        id="base32"
        title="32"
        value={converter.get(32)}
        onChange={(v) => converter.set(32, v)}
        ref={(r) => (inputRefs.current[32] = r!)}
        onFocus={() => setFocused({ base: 32, id: 0 })}
      />
    </>
  );
}

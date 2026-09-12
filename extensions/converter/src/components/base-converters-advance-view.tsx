import { Form } from "@raycast/api";
import { Dispatch, SetStateAction, useMemo, useRef } from "react";
import { buildBases } from "../utils/base-converter-utils";
import { BaseConverter } from "../hooks/use-base-converter";

type State = [number, Dispatch<SetStateAction<number>>];

export function BaseConvertersAdvanceView({
  converter,
  fromBaseState: [fromBase, setFromBase],
  toBaseState: [toBase, setToBase],
  setFocused,
}: {
  converter: BaseConverter;
  fromBaseState: State;
  toBaseState: State;
  setFocused: (v: { base: number; id: number }) => void;
}) {
  const bases = useMemo(buildBases, []);

  const inputRef = useRef<Form.TextField>(null);
  converter.ref.current[36] = useMemo(
    () => ({
      focus: () => {
        setFromBase(36);
        inputRef.current?.focus();
      },
    }),
    [],
  );

  return (
    <>
      <Form.Dropdown
        id="fromBase"
        title="From Base"
        value={fromBase.toString()}
        onChange={(v) => setFromBase(parseInt(v))}
      >
        {bases.map((base) => (
          <Form.Dropdown.Item key={base} value={base} title={base} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="toBase" title="To Base" value={toBase.toString()} onChange={(v) => setToBase(parseInt(v))}>
        {bases.map((base) => (
          <Form.Dropdown.Item key={base} value={base} title={base} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="input"
        title="Input"
        value={converter.get(fromBase, 1)}
        ref={inputRef}
        onChange={(v) => converter.set(fromBase, v, undefined, 1)}
        onFocus={() => setFocused({ base: fromBase, id: 1 })}
      />
      <Form.Description title="Output" text={converter.get(toBase, 1) + "\n"} />
    </>
  );
}

import { Action, ActionPanel, Form, Keyboard } from "@raycast/api";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import useByteConverter from "./hooks/use-byte-converter";
import { useState } from "react";

const unitToExponent = {
  bits: 0, // 2^0 bit
  Bytes: 3, // 2^3 bits
  KB: 13, // 2^10 B = 2^13 b
  MB: 23, // 2^20 B = 2^23 b
  GB: 33, // 2^30 B = 2^33 b
  TB: 43, // 2^40 B = 2^43 b
  PB: 53, // 2^50 B = 2^53 b
  EB: 63, // 2^60 B = 2^63 b
};

export default function ByteConverter() {
  const converter = useByteConverter(unitToExponent);

  const [focusedUnit, setFocusedUnit] = useState<keyof typeof unitToExponent>("bits");
  const focusedValue = `${converter.get(unitToExponent[focusedUnit])} ${focusedUnit}`;

  const bestUnit = converter.getBestUnitExpression();

  return (
    <Form
      actions={
        <ActionPanel>
          {bestUnit !== null && (
            <Action.CopyToClipboard
              title={`Copy ${bestUnit}`}
              content={bestUnit}
              // shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
          )}
          <Action.CopyToClipboard
            title={`Copy ${focusedValue}`}
            content={focusedValue}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <ActionPanel.Section>
            {Object.entries(unitToExponent).map(([unit, exponent], index) => (
              <Action.CopyToClipboard
                key={unit}
                title={`Copy ${converter.get(exponent)} ${unit}`}
                content={`${converter.get(exponent)} ${unit}`}
                shortcut={{ modifiers: ["cmd"], key: `${index + 1}` as Keyboard.KeyEquivalent }}
              />
            ))}
          </ActionPanel.Section>
          <ActionOpenPreferences showCommandPreferences={false} showExtensionPreferences={true} />
        </ActionPanel>
      }
    >
      {Object.entries(unitToExponent).map(([unit, exponent]) => (
        <Form.TextField
          key={unit}
          id={unit}
          title={unit}
          value={converter.get(exponent)}
          ref={(r) => (converter.ref.current[unit as keyof typeof unitToExponent] = r!)}
          placeholder="0"
          onChange={(v) => converter.set(exponent, v)}
          onFocus={() => setFocusedUnit(unit as keyof typeof unitToExponent)}
        />
      ))}
    </Form>
  );
}

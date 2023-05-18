import { Action, ActionPanel, Form } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { commonPreferences } from "./utils/common-utils";
import { getInputItem } from "./hooks/get-input-item";
import { convertToBytes, convert, KeyEquivalentByNumber, capitalize } from "./utils/byte-converter-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";

export default function ByteConverter() {
  const units = ["bits", "Bytes", "KB", "MB", "GB", "TB", "PB", "EB"] as const;
  type Unit = typeof units[number];
  type State = {
    [unit in Unit]: number;
  };
  type SetFunction = (value: string) => void;
  type SetFunctions<T> = {
    [P in keyof T as `set${Capitalize<string & P>}`]: SetFunction;
  };

  const [state, setState] = useState<State & SetFunctions<State>>(
    units.reduce((acc, unit) => {
      const capitalizedUnit = capitalize(unit);
      const setFunctionName = `set${capitalizedUnit}`;
      return {
        ...acc,
        [unit]: 0,
        [setFunctionName]: (newValue: string) => {
          let value = newValue || "0"; // Empty string
          value = value.replace(/[^\d.]/g, ""); // Should only contains numbers
          const parsedValue = parseFloat(value);
          if (isNaN(parsedValue)) {
            console.info(`newValue "${newValue}" is not a valid number`);
            return;
          }
          console.debug(newValue, value, parsedValue);
          const index = units.indexOf(unit);
          const bytesValue = convertToBytes(parsedValue, index);

          setState((prevState) => {
            const newState = { ...prevState };
            for (let i = 0; i < index; i++) {
              newState[units[i]] = convert(bytesValue, i);
            }
            newState[unit] = parsedValue;
            for (let i = index + 1; i < units.length; i++) {
              newState[units[i]] = convert(bytesValue, i);
            }
            return newState;
          });
        },
      };
    }, {} as State & SetFunctions<State>)
  );

  const textFields = useRef<(Form.TextField | null)[]>(Array.from({ length: units.length }));

  const [focusedTextFieldIndex, setFocusedTextFieldIndex] = useState<number>(0);

  const { autoDetect, priorityDetection } = commonPreferences();
  const inputItem = getInputItem(autoDetect, priorityDetection);
  useEffect(() => {
    async function _fetch() {
      state["setBytes"](inputItem);
    }

    _fetch().then();
  }, [inputItem]);

  const getBestUnitExpression = () => {
    const values = units.map((unit) => state[unit]);
    const maxValue = 1000;
    let bestIndex = 0;
    for (; bestIndex < units.length - 1; bestIndex++) {
      const value = values[bestIndex];
      if (value < maxValue) {
        break;
      }
    }
    return getExpressionAtIndex(bestIndex);
  };

  const getFocusedValueExpression = () => {
    return getExpressionAtIndex(focusedTextFieldIndex);
  };

  const getExpressionAtIndex = (index: number): string => {
    const unit = units[index];
    const value = state[unit];
    const expression = `${value} ${unit}`;
    return expression;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={`Copy ${getBestUnitExpression()}`}
            content={getBestUnitExpression()}
            shortcut={{ modifiers: [], key: "enter" }}
          />
          <Action.CopyToClipboard title={`Copy ${getFocusedValueExpression()}`} content={getFocusedValueExpression()} />
          <ActionPanel.Section>
            {units.map((_, index) => {
              const keyEquivalent = KeyEquivalentByNumber(index + 1);
              return (
                <Action.CopyToClipboard
                  key={index} // to make key unique to avoid warning
                  title={`Copy ${getExpressionAtIndex(index)}`}
                  content={getExpressionAtIndex(index)}
                  shortcut={keyEquivalent ? { modifiers: ["cmd"], key: keyEquivalent } : undefined}
                />
              );
            })}
          </ActionPanel.Section>
          <ActionOpenPreferences showCommandPreferences={false} showExtensionPreferences={true} />
        </ActionPanel>
      }
    >
      {units.map((unit, index) => (
        <Form.TextField
          key={unit}
          id={unit}
          title={unit}
          value={state[unit].toString()}
          ref={(el) => (textFields.current[index] = el)}
          autoFocus={index == 1}
          placeholder="0"
          onFocus={() => {
            setFocusedTextFieldIndex(index);
          }}
          onChange={(newValue) => {
            const setFunction = state[`set${capitalize(unit)}` as keyof typeof state];
            if (typeof setFunction === "function") {
              setFunction(newValue);
            }
          }}
        />
      ))}
    </Form>
  );
}

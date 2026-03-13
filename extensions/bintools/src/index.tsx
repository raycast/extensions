import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { InputType, parseInputNumber } from "./calculator";

export interface State {
  inputType: string;
  binNumber: string;
  decNumber: string;
  hexNumber: string;
  binFloat: binFloat | undefined;
}

export interface binFloat {
  singlePrecision: singlePrecFloat;
  doublePrecision: doublePrecFloat;
}

export interface singlePrecFloat {
  sign: string;
  exponent: string;
  mantissa: string;
  floatingPoint: string;
  floatDecimal: string;
}

export interface doublePrecFloat {
  sign: string;
  exponent: string;
  mantissa: string;
  floatingPoint: string;
  floatDecimal: string;
}

export default function Command() {
  const [state, setState] = useState<State>({
    binNumber: "",
    decNumber: "",
    hexNumber: "",
    binFloat: undefined,
    inputType: InputType.None,
  });

  function Actions({ content }: { content: string }) {
    return (
      <ActionPanel>
        <Action.CopyToClipboard content={content} />
        <Action.Paste content={content} />
      </ActionPanel>
    );
  }

  const normalListItems = [
    <List.Item title={"Detected Input"} accessories={[{ text: state.inputType }]} />,
    <List.Item
      title={"Binary Representation"}
      accessories={[{ text: state.binNumber }]}
      actions={<Actions content={state.binNumber} />}
    />,
    <List.Item
      title={"Decimal Representation"}
      accessories={[{ text: state.decNumber }]}
      actions={<Actions content={state.decNumber} />}
    />,
    <List.Item
      title={"Hexadecimal Representation"}
      accessories={[{ text: state.hexNumber }]}
      actions={<Actions content={state.hexNumber} />}
    />,
  ];

  const commaListItems = [
    <List.Item title={"Detected Input"} accessories={[{ text: state.inputType }]} />,
    <List.Item
      title={"Fixed Point Binary Representation"}
      accessories={[{ text: state.binNumber }]}
      actions={<Actions content={state.binNumber} />}
    />,
    <List.Item
      title={"Fixed Point Decimal Representation"}
      accessories={[{ text: state.decNumber }]}
      actions={<Actions content={state.decNumber} />}
    />,
    <List.Section title={"Floating Point Binary Representation — Single Precision"}>
      <List.Item
        title={"Sign"}
        accessories={[{ text: state.binFloat?.singlePrecision.sign }]}
        actions={<Actions content={state.binFloat?.singlePrecision.sign ?? ""} />}
      />
      <List.Item
        title={"Exponent"}
        accessories={[{ text: state.binFloat?.singlePrecision.exponent }]}
        actions={<Actions content={state.binFloat?.singlePrecision.exponent ?? ""} />}
      />
      <List.Item
        title={"Mantissa"}
        accessories={[{ text: state.binFloat?.singlePrecision.mantissa }]}
        actions={<Actions content={state.binFloat?.singlePrecision.mantissa ?? ""} />}
      />
      <List.Item
        title={"Floating Point"}
        accessories={[{ text: state.binFloat?.singlePrecision.floatingPoint }]}
        actions={<Actions content={state.binFloat?.singlePrecision.floatingPoint ?? ""} />}
      />
      <List.Item
        title={"Floating Point Decimal"}
        accessories={[{ text: state.binFloat?.singlePrecision.floatDecimal }]}
        actions={<Actions content={state.binFloat?.singlePrecision.floatDecimal ?? ""} />}
      />
    </List.Section>,
    <List.Section title={"Floating Point Binary Representation — Double Precision"}>
      <List.Item
        title={"Sign"}
        accessories={[{ text: state.binFloat?.doublePrecision.sign }]}
        actions={<Actions content={state.binFloat?.doublePrecision.sign ?? ""} />}
      />
      <List.Item
        title={"Exponent"}
        accessories={[{ text: state.binFloat?.doublePrecision.exponent }]}
        actions={<Actions content={state.binFloat?.doublePrecision.exponent ?? ""} />}
      />
      <List.Item
        title={"Mantissa"}
        accessories={[{ text: state.binFloat?.doublePrecision.mantissa }]}
        actions={<Actions content={state.binFloat?.doublePrecision.mantissa ?? ""} />}
      />
      <List.Item
        title={"Floating Point"}
        accessories={[{ text: state.binFloat?.doublePrecision.floatingPoint }]}
        actions={<Actions content={state.binFloat?.doublePrecision.floatingPoint ?? ""} />}
      />
      <List.Item
        title={"Floating Point Decimal"}
        accessories={[{ text: state.binFloat?.doublePrecision.floatDecimal }]}
        actions={<Actions content={state.binFloat?.doublePrecision.floatDecimal ?? ""} />}
      />
    </List.Section>,
  ];

  const isComma = state.inputType === InputType.BinaryComma || state.inputType === InputType.DecimalComma;
  return (
    //if the inputType is either Binary with comma or decimal with comma, then instead of showing the different representation show the number as a fixed point binary and a floating point binary broken down into its components
    <List
      isLoading={!state.inputType}
      searchBarPlaceholder="Enter your calculation: 0b0101+0xff..."
      onSearchTextChange={async (text: any) => {
        parseInputNumber(text, setState);
      }}
    >
      {!isComma
        ? normalListItems.map((item) => {
            return item;
          })
        : commaListItems.map((item) => {
            return item;
          })}
    </List>
  );
}

import { useState } from "react";
import { List } from "@raycast/api";
import { InputType, parseInputNumber } from "./calulator";

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

  const normalListItems = [
    <List.Item title={"Detected Input"} accessoryTitle={state.inputType} />,
    <List.Item title={"Binary Representation"} accessoryTitle={state.binNumber} />,
    <List.Item title={"Decimal Representation"} accessoryTitle={state.decNumber} />,
    <List.Item title={"Hexadecimal Representation"} accessoryTitle={state.hexNumber} />,
  ];

  const commaListItems = [
    <List.Item title={"Detected Input"} accessoryTitle={state.inputType} />,
    <List.Item title={"Fixed Point Binary Representation"} accessoryTitle={state.binNumber} />,
    <List.Item title={"Fixed Point Decimal Representation"} accessoryTitle={state.decNumber} />,
    <List.Section title={"Floating Point Binary Representation — Single Precision"}>
      <List.Item title={"Sign"} accessoryTitle={state.binFloat?.singlePrecision.sign} />
      <List.Item title={"Exponent"} accessoryTitle={state.binFloat?.singlePrecision.exponent} />
      <List.Item title={"Mantissa"} accessoryTitle={state.binFloat?.singlePrecision.mantissa} />
      <List.Item title={"Floating Point"} accessoryTitle={state.binFloat?.singlePrecision.floatingPoint} />
      <List.Item title={"Floating Point Decimal"} accessoryTitle={state.binFloat?.singlePrecision.floatDecimal} />
    </List.Section>,
    <List.Section title={"Floating Point Binary Representation — Double Precision"}>
      <List.Item title={"Sign"} accessoryTitle={state.binFloat?.doublePrecision.sign} />
      <List.Item title={"Exponent"} accessoryTitle={state.binFloat?.doublePrecision.exponent} />
      <List.Item title={"Mantissa"} accessoryTitle={state.binFloat?.doublePrecision.mantissa} />
      <List.Item title={"Floating Point"} accessoryTitle={state.binFloat?.doublePrecision.floatingPoint} />
      <List.Item title={"Floating Point Decimal"} accessoryTitle={state.binFloat?.doublePrecision.floatDecimal} />
    </List.Section>,
  ];
  const isComma = state.inputType === InputType.BinaryComma || state.inputType === InputType.DecimalComma;
  return (
    //if the inputType is either Binary with comma or decimal with comma, then instead of showing the different representation show the number as a fixed point binary and a floating point binary broken down into its components
    <List
      isLoading={!state.inputType}
      searchBarPlaceholder="Enter your calculation: 0b0101+0xff..."
      onSearchTextChange={async (text) => {
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

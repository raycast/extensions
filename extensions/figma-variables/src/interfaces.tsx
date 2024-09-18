export interface Variable {
  variableCollectionId: string;
  id: string;
  name: string;
  resolvedType: string;
  description: string;
  valuesByMode: ValuesByMode;
  codeSyntax?: { [key: string]: string };
}

export interface VariableAlias {
  type: "VARIABLE_ALIAS";
  id: string;
}

export type ValuesByMode = {
  [key: string]: VariableAlias | number;
};

export type ModeValue = {
  [modeId: string]: VariableAlias | ColorValue | number;
};

export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}
export type ModesMap = {
  [modeId: string]: string;
};

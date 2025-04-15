export enum GenericType {
  Function = "function",
  Macro = "macro",
  Type = "type",
  Callback = "callback",
}

export type Base<T extends GenericType[keyof GenericType]> = {
  name: string;
  specs: string[];
  documentation: string | null;
  type: T;
};

// Naming this "Func" because "Function" is a reserved in TypeScript.
export type Func = Base<"function">;
export type Macro = Base<"macro">;
export type Type = Base<"type">;
export type Callback = Base<"callback">;
export type Generic = Func | Macro | Type | Callback;

export type ModuleDoc = {
  name: string;
  functions: Func[];
  macros: Macro[];
  types: Type[];
  callbacks: Callback[];
};

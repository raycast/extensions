export type ApiResponse = {
  data: Package[];
};

export type Package = {
  name: string;
  description: string;
};

export type PackageInterface = {
  name: string;
  version: string;
  "gleam-version-constraint": string | null;
  modules: Record<string, ModuleInterface>;
};

export type ModuleInterface = {
  documentation: string[];
  "type-aliases": Record<string, TylerAliasInterface>;
  types: Record<string, TypeDefinitionInterface>;
  constants: Record<string, ConstantInterface>;
  functions: Record<string, FunctionInterface>;
};

type TylerAliasInterface = {
  documentation: string | null;
  deprecation: DeprecationInterface | null;
  parameters: number;
  alias: TypeInterface;
};

type TypeDefinitionInterface = {
  documentation: string | null;
  deprecation: DeprecationInterface | null;
  parameters: number;
  constructors: TypeConstructorInterface[];
};

type TypeConstructorInterface = {
  documentation: string | null;
  name: string;
  parameters: ParameterInterface[];
};

type ParameterInterface = {
  label: string | null;
  type: TypeInterface;
};

type ConstantInterface = {
  documentation: string | null;
  deprecation: DeprecationInterface | null;
  implementations: ImplementationsInterface;
  type: TypeInterface;
};

type FunctionInterface = {
  documentation: string | null;
  deprecation: DeprecationInterface | null;
  implementations: ImplementationsInterface;
  parameters: ParameterInterface[];
  return: TypeInterface;
};

type DeprecationInterface = {
  message: string;
};

type ImplementationsInterface = {
  gleam: boolean;
  uses_erlang_externals: boolean;
  uses_javascript_externals: boolean;
};

type TypeInterface =
  | { kind: "tuple"; elements: TypeInterface[] }
  | { kind: "fn"; parameters: TypeInterface[]; return: TypeInterface }
  | { kind: "variable"; id: number }
  | { kind: "named"; name: string; package: string; module: string; parameters: TypeInterface[] };

export type Documentation = {
  module: string;
  name: string;
  type: string;
  documentation: string | null;
  url: string;
};

export type Docs = {
  mods: Documentation[];
  types: Documentation[];
  typeAliases: Documentation[];
  constants: Documentation[];
  functions: Documentation[];
};

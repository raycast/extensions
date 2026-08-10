declare type BigNumberish = string | number | bigint;
declare type RawArgs = RawArgsObject | RawArgsArray;
declare type RawArgsObject = {
  [inputName: string]: MultiType | MultiType[] | RawArgs;
};
declare type RawArgsArray = Array<MultiType | MultiType[] | RawArgs>;
declare type MultiType = BigNumberish | Uint256 | object | boolean;
interface Uint256 {
  low: BigNumberish;
  high: BigNumberish;
}
declare enum StarknetChainId {
  SN_MAIN = "0x534e5f4d41494e",
  SN_GOERLI = "0x534e5f474f45524c49",
  SN_GOERLI2 = "0x534e5f474f45524c4932",
}
declare type RawCalldata = BigNumberish[];
declare enum TransactionHashPrefix {
  DECLARE = "0x6465636c617265",
  DEPLOY = "0x6465706c6f79",
  DEPLOY_ACCOUNT = "0x6465706c6f795f6163636f756e74",
  INVOKE = "0x696e766f6b65",
  L1_HANDLER = "0x6c315f68616e646c6572",
}

// [CUSTOM] removed Program from here
declare type LegacyContractClass = {
  entry_points_by_type: EntryPointsByType;
  abi: Abi;
};

// [CUSTOM] removed Omit from here
declare type LegacyCompiledContract = LegacyContractClass & {
  program: Program;
};

declare type CompressedProgram = string;

declare type EntryPointsByType = {
  CONSTRUCTOR: ContractEntryPointFields[];
  EXTERNAL: ContractEntryPointFields[];
  L1_HANDLER: ContractEntryPointFields[];
};

/** ABI */
declare type Abi = Array<FunctionAbi | EventAbi | StructAbi>;
declare type AbiEntry = {
  name: string;
  type: "felt" | "felt*" | string;
};
declare enum FunctionAbiType {
  "function" = 0,
  "l1_handler" = 1,
  "constructor" = 2,
}
declare type FunctionAbi = {
  inputs: AbiEntry[];
  name: string;
  outputs: AbiEntry[];
  stateMutability?: "view";
  state_mutability?: string;
  type: FunctionAbiType;
};
declare type AbiStructs = {
  [name: string]: StructAbi;
};
declare type StructAbi = {
  members: (AbiEntry & {
    offset: number;
  })[];
  name: string;
  size: number;
  type: "struct";
};
declare type EventAbi = any;

// [CUSTOM] removed extends Record<string,any> from here
interface Program {
  builtins: string[];
  data: string[];
}

declare type ContractEntryPointFields = {
  selector: string;
  offset: string;
  builtins?: Builtins;
};

declare type Builtins = string[];

declare type CompiledSierra = SierraContractClass;
declare type CompiledSierraCasm = CairoAssembly;

declare type SierraContractClass = {
  sierra_program: ByteCode;
  sierra_program_debug_info: SierraProgramDebugInfo;
  contract_class_version: string;
  entry_points_by_type: SierraEntryPointsByType;
  abi: Abi;
};

declare type CairoAssembly = {
  prime: string;
  compiler_version: string;
  bytecode: ByteCode;
  hints: any[];
  pythonic_hints: PythonicHints;
  entry_points_by_type: EntryPointsByType;
};

declare type ByteCode = string[];
declare type PythonicHints = [number, string[]][];

declare type SierraProgramDebugInfo = {
  type_names: [number, string][];
  libfunc_names: [number, string][];
  user_func_names: [number, string][];
};

declare type SierraEntryPointsByType = {
  CONSTRUCTOR: SierraContractEntryPointFields[];
  EXTERNAL: SierraContractEntryPointFields[];
  L1_HANDLER: SierraContractEntryPointFields[];
};

declare type SierraContractEntryPointFields = {
  selector: string;
  function_idx: number;
};

export {};

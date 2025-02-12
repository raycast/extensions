import * as starknet from "starknet";
import { createCheckers } from "ts-interface-checker";
import { basicTypes, BasicType, TEnumType } from "ts-interface-checker/dist/types";
import runtimeTsTypes from "./starknetJsTypes-ti";

basicTypes["bigint"] = new BasicType((v) => v instanceof BigInt, "is not a bigint");

export enum StarknetJsType {
  BIG_NUMBERISH = "BigNumberish",
  RAW_ARGS = "RawArgs",
  STRING = "string",
  STARKNET_CHAIID = "StarknetChainId",
  RAW_CALLDATA = "RawCalldata",
  BIG_NUMBERISH_ARRAY = "BigNumberish[]",
  TRANSACTION_HASH_PREFIX = "TransactionHashPrefix",
  LEGACY_COMPILED_CONTRACT = "LegacyCompiledContract",
  COMPILED_SIERRA_CASM = "CompiledSierraCasm",
  COMPILED_SIERRA = "CompiledSierra",
  UNKNOWN = "UNKNOWN",
}

export enum EntryType {
  TEXT,
  TEXTAREA,
  DROPWDOWN,
}

const {
  BigNumberish: BigNumberishChecker,
  RawArgs: RawArgsChecker,
  StarknetChainId: StarknetChainIdChecker,
  RawCalldata: RawCalldataChecker,
  TransactionHashPrefix: TransactionHashPrefixChecker,
  LegacyCompiledContract: LegacyCompiledContractChecker,
  CompiledSierraCasm: CompiledSierraCasmChecker,
  CompiledSierra: CompiledSierraChecker,
} = createCheckers(runtimeTsTypes);

export const getEntryType = (type: StarknetJsType) => {
  switch (type) {
    case StarknetJsType.BIG_NUMBERISH:
    case StarknetJsType.STRING:
      return EntryType.TEXT;
    case StarknetJsType.BIG_NUMBERISH_ARRAY:
    case StarknetJsType.RAW_ARGS:
    case StarknetJsType.RAW_CALLDATA:
    case StarknetJsType.LEGACY_COMPILED_CONTRACT:
    case StarknetJsType.COMPILED_SIERRA_CASM:
    case StarknetJsType.COMPILED_SIERRA:
    case StarknetJsType.UNKNOWN:
      return EntryType.TEXTAREA;
    case StarknetJsType.STARKNET_CHAIID:
    case StarknetJsType.TRANSACTION_HASH_PREFIX:
      return EntryType.DROPWDOWN;
  }
};

export const getDropwdownElements = (type: StarknetJsType): { [name: string]: any } => {
  let enumType;
  switch (type) {
    case StarknetJsType.STARKNET_CHAIID:
      enumType = StarknetChainIdChecker.getType() as TEnumType;
      break;
    case StarknetJsType.TRANSACTION_HASH_PREFIX:
      enumType = TransactionHashPrefixChecker.getType() as TEnumType;
      break;
    default:
      return [];
  }

  return enumType.members;
};

export const getDefaultValue = (type: StarknetJsType) => {
  if (type === StarknetJsType.STARKNET_CHAIID) {
    return getDropwdownElements(type)["SN_GOERLI"];
  }
  if (type === StarknetJsType.TRANSACTION_HASH_PREFIX) {
    return getDropwdownElements(type)["DECLARE"];
  }
};

export const validateType = (
  type: StarknetJsType,
  value: string
): { valid: true } | { valid: false; errorMessage: string } => {
  let innerChecks;
  try {
    switch (type) {
      case StarknetJsType.BIG_NUMBERISH:
        BigNumberishChecker.check(value);
        if (!/^\d+$/.test(value) && !starknet.num.isHex(value)) {
          return { valid: false, errorMessage: "must be a number or hex" };
        }
        break;
      case StarknetJsType.RAW_ARGS:
        RawArgsChecker.check(JSON.parse(value));
        break;
      case StarknetJsType.STARKNET_CHAIID:
        StarknetChainIdChecker.check(value);
        break;
      case StarknetJsType.BIG_NUMBERISH_ARRAY:
      case StarknetJsType.RAW_CALLDATA:
        RawCalldataChecker.check(JSON.parse(value));
        innerChecks = JSON.parse(value)
          .map((item: any) => validateType(StarknetJsType.BIG_NUMBERISH, item))
          .filter((result: any) => !result.valid);
        if (innerChecks.length > 0) {
          return innerChecks[0];
        }
        break;
      case StarknetJsType.TRANSACTION_HASH_PREFIX:
        TransactionHashPrefixChecker.check(value);
        break;
      case StarknetJsType.LEGACY_COMPILED_CONTRACT:
        LegacyCompiledContractChecker.check(JSON.parse(value));
        break;
      case StarknetJsType.COMPILED_SIERRA_CASM:
        CompiledSierraCasmChecker.check(JSON.parse(value));
        break;
      case StarknetJsType.COMPILED_SIERRA:
        CompiledSierraChecker.check(JSON.parse(value));
        break;
      case StarknetJsType.UNKNOWN:
      case StarknetJsType.STRING:
      default:
      // add cases for different types if needed
    }
    return { valid: true };
  } catch (error) {
    let message = "invalid format";
    if (error instanceof Error) message = error.message;
    return {
      valid: false,
      errorMessage: message,
    };
  }
};

export const getPlaceholder = (type: StarknetJsType): string => {
  switch (type) {
    case StarknetJsType.BIG_NUMBERISH:
      return "1";
    case StarknetJsType.BIG_NUMBERISH_ARRAY:
    case StarknetJsType.RAW_CALLDATA:
    case StarknetJsType.RAW_ARGS:
      return "[1, 2]";
    case StarknetJsType.STRING:
      return "1";
    case StarknetJsType.TRANSACTION_HASH_PREFIX:
      return "0x6465636c617265";
    case StarknetJsType.LEGACY_COMPILED_CONTRACT:
    case StarknetJsType.COMPILED_SIERRA_CASM:
    case StarknetJsType.COMPILED_SIERRA:
    case StarknetJsType.STARKNET_CHAIID:
    case StarknetJsType.UNKNOWN:
  }
  return "";
};

export const parseValue = (type: StarknetJsType, value: string): any => {
  try {
    let parsedValue = value;
    let jsCode;
    switch (type) {
      case StarknetJsType.LEGACY_COMPILED_CONTRACT:
      case StarknetJsType.COMPILED_SIERRA_CASM:
      case StarknetJsType.COMPILED_SIERRA:
      case StarknetJsType.BIG_NUMBERISH_ARRAY:
      case StarknetJsType.RAW_CALLDATA:
      case StarknetJsType.UNKNOWN:
      case StarknetJsType.RAW_ARGS:
        // not using JSON.parse here as that won't work if there are no double quotes
        jsCode = `let variable = ${parsedValue}; variable;`;
        parsedValue = eval(jsCode);
        break;
      case StarknetJsType.BIG_NUMBERISH:
      case StarknetJsType.STRING:
      case StarknetJsType.STARKNET_CHAIID:
      case StarknetJsType.TRANSACTION_HASH_PREFIX:
    }
    return parsedValue;
  } catch (err) {
    return value;
  }
};

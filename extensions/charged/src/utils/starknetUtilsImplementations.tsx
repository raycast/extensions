import * as starknet from "starknet";
import {
  StarknetArgument,
  StarknetCommandGeneric,
  StarknetCommandImplementationType,
  StarknetCommandStarknetJs,
  StarknetUtilsCommand,
} from "../config/data/starknetUtilsConfig";
import { parseValue } from "./starknetJsTypeUtils";
import { stringifyBigInt } from "./object";

const parseArgs = (values: { [name: string]: any }, args: StarknetArgument[]) => {
  const parsedArgs: any = {};
  args.forEach((arg) => {
    const value = values[arg.name];
    if (!value) {
      return;
    }
    parsedArgs[arg.name] = parseValue(arg.type, value);
  });
  return parsedArgs;
};

const parseFinalResponse = (result: any) => {
  let strResult = stringifyBigInt(result);
  if (strResult[0] == '"') {
    strResult = strResult.slice(1, strResult.length - 1); // removing double quotes
  }

  if (/^\d+$/.test(strResult)) {
    strResult = starknet.num.toHex(strResult);
  }
  return strResult;
};

const starknetJsImplementation = (
  command: StarknetCommandStarknetJs & StarknetCommandGeneric,
  argsValue: { [name: string]: any }
) => {
  const parsedArgs = parseArgs(argsValue, command.arguments);
  let func: any = starknet;
  command.path.split(".").forEach((item) => (func = func[item]));
  let result;
  try {
    if (command.implementationType === StarknetCommandImplementationType.STARKNETJS_CONSTANT) {
      result = func;
    } else {
      result = func.apply(this, Object.values(parsedArgs));
    }
  } catch (error) {
    let message = "Failed to generate output";
    if (error instanceof Error) message = error.message;
    result = message;
  }
  return parseFinalResponse(result);
};

export const getStorageAddress = (command: StarknetUtilsCommand["command"], argsValue: { [name: string]: any }) => {
  const parsedArgs = parseArgs(argsValue, command.arguments);
  let result: any = starknet.hash.starknetKeccak(parsedArgs.input);

  if (parsedArgs.args) {
    parsedArgs.args.forEach((arg: any) => {
      result = starknet.ec.starkCurve.pedersen(result, arg);
    });
  }

  return parseFinalResponse(result);
};

export const implement = (command: StarknetUtilsCommand["command"], argsValue: { [name: string]: any }) => {
  switch (command.implementationType) {
    case StarknetCommandImplementationType.STARKNETJS_FUNCTION:
    case StarknetCommandImplementationType.STARKNETJS_CONSTANT:
      return starknetJsImplementation(command, argsValue);
    case StarknetCommandImplementationType.CUTOM:
      return command.implementation(command, argsValue);
  }
};

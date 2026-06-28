import { StarknetJsType, getDefaultValue } from "../../utils/starknetJsTypeUtils";
import { getStorageAddress } from "../../utils/starknetUtilsImplementations";

export enum StarknetUtilsConfigItemType {
  SECTION, // section has a list below
  COMMAND, // opens the command interface where you can enter values and get results
  LIST, // list shows a list once you enter the command
}

export type StarknetUtilsSection = {
  type: StarknetUtilsConfigItemType.SECTION;
  items: StarknetUtils[];
};

export type StarknetArgument = { name: string; type: StarknetJsType; required: boolean; defaultValue?: string };

export enum StarknetCommandImplementationType {
  STARKNETJS_FUNCTION,
  STARKNETJS_CONSTANT,
  CUTOM,
}

export type StarknetCommandStarknetJs = {
  path: string;
  implementationType:
    | StarknetCommandImplementationType.STARKNETJS_CONSTANT
    | StarknetCommandImplementationType.STARKNETJS_FUNCTION;
};

export type StarknetCommandCustom = {
  implementationType: StarknetCommandImplementationType.CUTOM;
  implementation: any;
};

export type StarknetCommandGeneric = {
  arguments: StarknetArgument[];
  return: {
    type: string;
    title: string;
  };
};

export type StarknetUtilsCommand = {
  type: StarknetUtilsConfigItemType.COMMAND;
  command: (StarknetCommandCustom | StarknetCommandStarknetJs) & StarknetCommandGeneric;
};

export type StarknetUtilsList = {
  type: StarknetUtilsConfigItemType.COMMAND;
  items: StarknetUtils[];
};

export type StarknetUtils = (StarknetUtilsList | StarknetUtilsCommand | StarknetUtilsSection) & {
  title: string;
};

const CUSTOM_NAME: { [name: string]: string } = {
  computeLegacyContractClassHash: "Get Class Hash from Legacy Contract",
  computeCompiledClassHash: "Get Class Hash from Casm",
  computeSierraContractClassHash: "Get Class Hash from Sierra",
  uint256ToBN: "U256 to BN",
  bnToUint256: "BN to U256",
  randomAddress: "Generate random address",
  StarknetChainId: "Get all chains",
  UDC: "Get UDC address",
  BaseUrl: "Base urls for all networks",
};

const isConstantSingature = (signature: string) => {
  if (signature.includes(`declare const`)) {
    return true;
  }
  return false;
};

const buildArgumentsFromFunctionSignature = (signature: string): StarknetArgument[] => {
  if (isConstantSingature(signature)) {
    return [];
  }
  return signature
    .split("(")[1]
    .split(")")[0]
    .split(",")
    .map((arg) => arg.trim())
    .filter((item) => item)
    .map((arg) => {
      let type = arg.split(":")[1].trim() as StarknetJsType;
      if (!Object.values(StarknetJsType).includes(type)) {
        console.warn(`Unhandled type in Starknet Util - ${type}`);
        type = StarknetJsType.UNKNOWN;
      }
      return {
        name: arg.split(":")[0].trim(),
        type: type,
        required: !arg.includes("?"),
        defaultValue: getDefaultValue(type),
      };
    });
};

const getReturnTypeFromFunctionSignature = (signature: string): string => {
  return signature.slice(signature.lastIndexOf(":") + 1).trim();
};

const getFunctionNameFromFunctionSignature = (signature: string): string => {
  if (isConstantSingature(signature)) {
    return signature.replace("declare const", "").trim();
  }
  const elems = signature.slice(0, signature.indexOf("(")).split(" ");
  return elems[elems.length - 1];
};

// helloThere -> Hello There
const camelCaseToTitleCase = (str: string): string => {
  const spaces = str.replace(/([A-Z])/g, " $1");
  return spaces.charAt(0).toUpperCase() + spaces.slice(1);
};

const buildCommandsFromFunctionList = (basePath: string, listString: string): StarknetUtils[] => {
  return listString
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item)
    .map((signature) => {
      const functionName = getFunctionNameFromFunctionSignature(signature);
      return {
        type: StarknetUtilsConfigItemType.COMMAND,
        command: {
          path: `${basePath ? basePath + "." : ""}${functionName}`,
          arguments: buildArgumentsFromFunctionSignature(signature),
          return: {
            type: getReturnTypeFromFunctionSignature("string"),
            title: "Output",
          },
          implementationType: isConstantSingature(signature)
            ? StarknetCommandImplementationType.STARKNETJS_CONSTANT
            : StarknetCommandImplementationType.STARKNETJS_FUNCTION,
        },
        title: CUSTOM_NAME[functionName] ? CUSTOM_NAME[functionName] : camelCaseToTitleCase(functionName),
      };
    });
};

export const STARKNET_UTILS_CONFIG: StarknetUtils[] = [
  {
    type: StarknetUtilsConfigItemType.SECTION,
    title: "Hash",
    items: [
      ...buildCommandsFromFunctionList(
        "hash",
        `
      declare function getSelectorFromName(funcName: string): string;
      declare function computeLegacyContractClassHash(contract: LegacyCompiledContract | string): string;
      declare function computeCompiledClassHash(casm: CompiledSierraCasm): string;
      declare function computeSierraContractClassHash(sierra: CompiledSierra): string;
      declare function calculateContractAddressFromHash(salt: BigNumberish, classHash: BigNumberish, constructorCalldata: RawArgs, deployerAddress: BigNumberish): string;
      declare function calculateTransactionHash(contractAddress: BigNumberish, version: BigNumberish, calldata: RawCalldata, maxFee: BigNumberish, chainId: StarknetChainId, nonce: BigNumberish): string;
      declare function calculateDeclareTransactionHash(classHash: string, senderAddress: BigNumberish, version: BigNumberish, maxFee: BigNumberish, chainId: StarknetChainId, nonce: BigNumberish, compiledClassHash?: string): string;
      declare function calculateDeployAccountTransactionHash(contractAddress: BigNumberish, classHash: BigNumberish, constructorCalldata: RawCalldata, salt: BigNumberish, version: BigNumberish, maxFee: BigNumberish, chainId: StarknetChainId, nonce: BigNumberish): string;
    `
      ),
      {
        type: StarknetUtilsConfigItemType.COMMAND,
        title: "Get storage address from name",
        command: {
          arguments: [
            {
              name: "input",
              type: StarknetJsType.STRING,
              required: true,
            },
            {
              name: "args",
              type: StarknetJsType.BIG_NUMBERISH_ARRAY,
              required: false,
            },
          ],
          implementationType: StarknetCommandImplementationType.CUTOM,
          return: {
            title: "Output",
            type: "string",
          },
          implementation: getStorageAddress,
        },
      },
    ],
  },
  {
    type: StarknetUtilsConfigItemType.SECTION,
    title: "Stark",
    items: buildCommandsFromFunctionList(
      "stark",
      `
      declare function randomAddress(): string;
      declare function estimatedFeeToMaxFee(estimatedFee: BigNumberish, overhead?: number): bigint;
    `
    ),
  },
  {
    type: StarknetUtilsConfigItemType.SECTION,
    title: "U256",
    items: buildCommandsFromFunctionList(
      "uint256",
      `
      declare function uint256ToBN(uint256: Uint256): bigint;
      declare function bnToUint256(bignumber: BigNumberish): Uint256;
    `
    ),
  },
  {
    type: StarknetUtilsConfigItemType.SECTION,
    title: "Constants",
    items: buildCommandsFromFunctionList(
      "constants",
      `
      declare const StarknetChainId
      declare const UDC
      declare const BaseUrl
    `
    ),
  },
];

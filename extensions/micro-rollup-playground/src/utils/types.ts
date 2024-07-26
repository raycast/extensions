import { TypedDataField } from "ethers";

export type Schema = {
  identifier: string;
  types: Record<string, TypedDataField[]>;
};

import { Buffer } from "node:buffer";

export const handleError = (error) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  process.exit(0);
};

export const base64Decode = (input) => Buffer.from(input, "base64").toString("utf-8");

export const decodeParameters = (input) => {
  const decoded = base64Decode(input);
  return JSON.parse(decoded);
};

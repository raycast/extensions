import fs from "fs";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { streamObject } from "stream-json/streamers/streamObject";

type Validator = (value: unknown) => boolean;

interface PropertyValidator {
  type: string;
  validate: Validator;
}

const requiredProps: Record<string, PropertyValidator> = {
  v: { type: "string", validate: (v): v is string => typeof v === "string" && /^\d/.test(v) },
  fr: { type: "number", validate: (v): v is number => typeof v === "number" && v > 0 },
  ip: { type: "number", validate: (v): v is number => typeof v === "number" && v >= 0 },
  op: { type: "number", validate: (v): v is number => typeof v === "number" && v >= 0 },
  w: { type: "integer", validate: (v): v is number => Number.isInteger(v) && (v as number) > 0 },
  h: { type: "integer", validate: (v): v is number => Number.isInteger(v) && (v as number) > 0 },
};

export const isValidLottie = async (path: string): Promise<boolean> => {
  const foundProperties = new Set<string>();
  let openArrayCount = 0;

  const pipeline = chain([
    fs.createReadStream(path),
    parser(),
    (data) => {
      if (data.name === "startArray") {
        openArrayCount++;
        return null;
      }
      if (data.name === "endArray") {
        openArrayCount--;
        return null;
      }

      return openArrayCount > 0 ? null : data;
    },
    streamObject(),
  ]);

  try {
    for await (const { key, value } of pipeline) {
      if (key in requiredProps) {
        const { type, validate } = requiredProps[key];
        if (!validate(value)) {
          throw new Error(`Expected ${key} to be ${type}, but got ${typeof value}`);
        }
        foundProperties.add(key);
      }
      if (foundProperties.size === Object.keys(requiredProps).length) {
        return true;
      }
    }

    const missingProps = Object.keys(requiredProps).filter((prop) => !foundProperties.has(prop));
    if (missingProps.length > 0) {
      throw new Error(`Missing required properties: ${missingProps.join(", ")}`);
    }

    return true;
  } catch (err) {
    throw new Error(`Lottie validation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
};

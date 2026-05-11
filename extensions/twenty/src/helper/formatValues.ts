/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataModelWithFields } from "../services/zod/schema/recordFieldSchema";
import { splitFullName } from "./splitFullName";
import { createTwentyEmailObject } from "./twentyEmailObject";
import { createTwentyUrlObject } from "./twentyUrlObject";

export function formatValues(values: Record<string, any>, objectRecordMetadata: DataModelWithFields) {
  const formattedValues: Record<string, any> = { ...values };

  for (const key in values) {
    const field = objectRecordMetadata.fields.find((field) => field.name === key);
    if (field) {
      switch (field.type) {
        case "LINKS":
          {
            formattedValues[key] = createTwentyUrlObject(values[key]);
          }
          break;
        case "FULL_NAME": {
          formattedValues[key] = splitFullName(values[key]);
          break;
        }
        case "EMAILS": {
          formattedValues[key] = createTwentyEmailObject(values[key]);
          break;
        }
        case "SELECT": {
          if (formattedValues[key] === "") {
            formattedValues[key] = null;
          }
          break;
        }
        case "RATING": {
          if (formattedValues[key] === "") {
            formattedValues[key] = null;
          }
          break;
        }
        case "MULTI_SELECT": {
          if (formattedValues[key] === "") {
            formattedValues[key] = null;
          }
          break;
        }
        default:
          break;
      }
    }
  }

  return formattedValues;
}

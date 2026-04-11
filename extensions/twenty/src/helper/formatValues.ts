/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataModelWithFields } from "../services/zod/schema/recordFieldSchema";
import { splitFullName } from "./splitFullName";
import { createTwentyCurrencyObject } from "./twentyCurrencyObject";
import { createTwentyEmailObject } from "./twentyEmailObject";
import { createTwentyPhoneObject } from "./twentyPhoneObject";
import { createTwentyUrlObject } from "./twentyUrlObject";

export function formatValues(values: Record<string, any>, objectRecordMetadata: DataModelWithFields) {
  const formattedValues: Record<string, any> = {};

  for (const field of objectRecordMetadata.fields) {
    switch (field.type) {
      case "LINKS": {
        formattedValues[field.name] = createTwentyUrlObject(values[field.name] ?? "");
        break;
      }
      case "FULL_NAME": {
        formattedValues[field.name] = splitFullName(values[field.name] ?? "");
        break;
      }
      case "EMAILS": {
        formattedValues[field.name] = createTwentyEmailObject(values[field.name] ?? "");
        break;
      }
      case "CURRENCY": {
        formattedValues[field.name] = createTwentyCurrencyObject(
          values[`${field.name}__amount`] ?? "",
          values[`${field.name}__currencyCode`] ?? "",
        );
        break;
      }
      case "PHONES": {
        formattedValues[field.name] = createTwentyPhoneObject(
          values[`${field.name}__primaryPhoneNumber`] ?? "",
          values[`${field.name}__primaryPhoneCountryCode`] ?? "",
          values[`${field.name}__primaryPhoneCallingCode`] ?? "",
        );
        break;
      }
      case "SELECT":
      case "RATING":
      case "MULTI_SELECT": {
        formattedValues[field.name] = values[field.name] === "" ? null : values[field.name];
        break;
      }
      default: {
        formattedValues[field.name] = values[field.name];
        break;
      }
    }
  }

  return formattedValues;
}

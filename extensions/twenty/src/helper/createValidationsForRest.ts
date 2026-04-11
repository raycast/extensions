/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataModelWithFields } from "../services/zod/schema/recordFieldSchema";

export function createValidationsForRest(rest: DataModelWithFields["fields"]): any {
  // Validation for fields in the rest variable
  return rest.reduce((acc: Record<string, (value: any) => void | string>, field) => {
    switch (field.type) {
      case "TEXT":
      case "FULL_NAME": {
        break;
      }
      case "LINKS": {
        acc[field.name] = (value) => {
          const urlPattern =
            /^(https?:\/\/(localhost|[^\s$.?#].[^\s]*))?|([^\s$.?#].[^\s]*)(,\s*(https?:\/\/(localhost|[^\s$.?#].[^\s]*))?|([^\s$.?#].[^\s]*))*$/i;

          if (value) {
            const urls = value.split(",");
            for (const url of urls) {
              if (!urlPattern.test(url.trim())) {
                return `Invalid ${field.name}`;
              }
            }
          }
        };
        break;
      }
      case "EMAILS": {
        acc[field.name] = (value) => {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value) {
            const emails = value.split(",");
            for (const email of emails) {
              if (!emailPattern.test(email.trim())) {
                return `Invalid ${field.name}`;
              }
            }
          }
        };
        break;
      }
      case "PHONES": {
        acc[`${field.name}__primaryPhoneCountryCode`] = (value) => {
          if (value && !/^[A-Za-z]{2}$/.test(String(value).trim())) {
            return `Invalid ${field.name}`;
          }
        };

        acc[`${field.name}__primaryPhoneCallingCode`] = (value) => {
          if (value && !/^\+\d+$/.test(String(value).trim())) {
            return `Invalid ${field.name}`;
          }
        };
        break;
      }
      case "DATE":
      case "DATE_TIME":
        break;
      case "BOOLEAN":
        break;
      case "NUMBER":
      case "NUMERIC":
        break;
      case "CURRENCY": {
        acc[`${field.name}__amount`] = (value) => {
          const normalizedValue = String(value ?? "").trim();
          if (normalizedValue && Number.isNaN(Number(normalizedValue))) {
            return `Invalid ${field.name}`;
          }
        };

        acc[`${field.name}__currencyCode`] = (value) => {
          if (value && !/^[A-Za-z]{3}$/.test(String(value).trim())) {
            return `Invalid ${field.name}`;
          }
        };
        break;
      }
      case "RATING":
        break;
      case "SELECT":
      case "MULTI_SELECT":
        break;
      case "ADDRESS":
        break;
      default:
        break;
    }
    return acc;
  }, {});
}

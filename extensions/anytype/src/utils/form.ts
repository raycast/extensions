import { PropertyFormat, RawPropertyWithValue } from "../models";

/**
 * Form validation to ensure that number fields contain only numbers.
 */
export function getNumberFieldValidations(
  properties: RawPropertyWithValue[],
): Record<string, (value: unknown) => string | undefined> {
  return properties
    .filter((prop) => prop.format === PropertyFormat.Number)
    .reduce(
      (acc, prop) => {
        acc[prop.key] = (value: unknown) => {
          const str = typeof value === "string" ? value : undefined;
          if (str !== "" || (str && isNaN(Number(str)))) {
            return "Value must be a number";
          }
          return undefined;
        };
        return acc;
      },
      {} as Record<string, (value: unknown) => string | undefined>,
    );
}

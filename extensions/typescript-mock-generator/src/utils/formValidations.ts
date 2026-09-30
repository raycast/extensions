import { FormValidation } from "@raycast/utils";
import { FormValues } from "../types/formValues";

type ValidationError = string | undefined | null;
type Validator<ValueType> = ((value: ValueType | undefined) => ValidationError) | FormValidation;
type Validation<T extends FormValues> = {
  [id in keyof T]?: Validator<T[id]>;
};

export const formValidations: Validation<FormValues> = {
  input: (value) => {
    if (value && !value.includes("interface")) {
      return "Are you sure you used interfaces? Only interfaces are allowed for the typescript generation";
    } else if (!value) {
      return "Typescript interface input is required";
    }
  },
  rows: (value) => {
    if (value && Number.isNaN(value)) {
      return "Rows must be a number";
    } else if (!value) {
      return "The number of rows per interface is required";
    }
  },
};

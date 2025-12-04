import { Input } from "./Input.styles-api";
import { InputWrapper } from "./InputWrapper.styles-api";

const InputStyles = { ...Input };

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete InputStyles.rightSection;

export const TagInput = {
  // wrapper: 'Wrapper around input and dropdown',
  // disabled: 'Disabled item modifier',
  values: "Values wrapper",
  value: "Value element",
  tagInput: "Tag input, rendered after all values",
  defaultValue: "Default value component wrapper",
  defaultValueRemove: "Default value remove control",
  ...InputStyles,
  ...InputWrapper,
};

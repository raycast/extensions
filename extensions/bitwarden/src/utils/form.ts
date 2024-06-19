import { Form } from "@raycast/api";

export const CustomValidations = {
  NumberBetween: (min: number, max: number) => {
    return (value: string | undefined) => {
      const num = value !== "" ? Number(value) : NaN;
      if (isNaN(num) || num < min || num > max) return `Must be between ${min} and ${max}`;
      return undefined;
    };
  },
  OneCharacter: (value: string | undefined) => {
    if (!value || value.length !== 1) return "Must be one character";
    return undefined;
  },
};

export const stringifyBooleanItemProps = <TValue extends string>(
  itemProps: Form.ItemProps<boolean>,
  trueValue: TValue,
  falseValue: TValue
): Form.ItemProps<string> => ({
  ...itemProps,
  defaultValue: itemProps.value ? trueValue : falseValue,
  value: itemProps.value ? trueValue : falseValue,
  onChange: (value) => itemProps.onChange?.(value === trueValue),
  onBlur: (event) => {
    itemProps.onBlur?.({ ...event, target: { ...event.target, value: event.target.value === trueValue } });
  },
  onFocus: (event) => {
    itemProps.onFocus?.({ ...event, target: { ...event.target, value: event.target.value === trueValue } });
  },
});

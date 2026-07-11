import { Form } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect } from "react";

export const CustomValidations = {
  NumberStringBetween: (min: number, max: number) => {
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

type UseFormProps<T extends Form.Values> = Parameters<typeof useForm<T>>[0];
export const useOnChangeForm = <T extends Form.Values>(
  props: Omit<UseFormProps<T>, "onSubmit"> & { onChange: UseFormProps<T>["onSubmit"] }
) => {
  const form = useForm({ ...props, onSubmit: props.onChange });
  useEffect(() => void form.handleSubmit(form.values), [form.values]);
  return form;
};

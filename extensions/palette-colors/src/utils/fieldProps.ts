import { Form } from "@raycast/api";

type ItemProps<V extends Form.Value> = Partial<Form.ItemProps<V>> & { id: string };

type FocusHandlers = {
  onFocus: () => void;
  onBlur: () => void;
};

/**
 * Adds focus tracking to useForm item props without replacing them.
 * Spreading focus handlers after itemProps would drop useForm's onBlur,
 * which is what validates a field when the user leaves it.
 */
export function withFocus<V extends Form.Value>(item: ItemProps<V>, focus: FocusHandlers): ItemProps<V> {
  return {
    ...item,
    onFocus: (event) => {
      item.onFocus?.(event);
      focus.onFocus();
    },
    onBlur: (event) => {
      item.onBlur?.(event);
      focus.onBlur();
    },
  };
}

/**
 * Validates on every keystroke, so limits show up while typing instead of
 * only on blur or when the form is submitted.
 */
export function withLiveValidation<V extends Form.Value>(
  item: ItemProps<V>,
  validate: (value: V) => string | undefined,
  setError: (id: string, error: string | undefined) => void,
): ItemProps<V> {
  return {
    ...item,
    onChange: (value) => {
      item.onChange?.(value);
      setError(item.id, validate(value));
    },
  };
}

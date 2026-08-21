/**
 * Required, counting a value of only spaces as missing. `FormValidation.Required` accepts one,
 * which would save a connection whose row renders with an empty title.
 */
export function requiredText(value: string | undefined): string | undefined {
  return value?.trim() ? undefined : 'Required';
}

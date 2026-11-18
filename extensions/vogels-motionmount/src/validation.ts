export const MAX_NAME_BYTES = 32;

export function integerIn(min: number, max: number) {
  return (value?: string) => {
    const number = Number(value);
    if (value?.trim() === "" || !Number.isInteger(number) || number < min || number > max) {
      return `Enter a whole number between ${min} and ${max}`;
    }
  };
}

export function presetName(value?: string) {
  if (!value?.trim()) return "Name is required";
  if (Buffer.byteLength(value.trim()) > MAX_NAME_BYTES) return "Name is too long";
}

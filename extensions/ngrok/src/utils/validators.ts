export function validatePort(value: string | undefined) {
  if (value === "") return "Required field.";
  const nValue = Number(value);
  if (isNaN(nValue) || nValue > 65535) return "Enter a valid port.";
}

export function validateLabel(value: string | undefined) {
  if (value && value.length > 24) {
    return "Allowed up to 24 characters.";
  }
}

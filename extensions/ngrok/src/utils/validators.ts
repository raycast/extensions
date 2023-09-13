export function validatePort(value: string | undefined) {
  if (value === "") return "Required field.";
  const nValue = Number(value);
  if (isNaN(nValue) || nValue > 65535) return "Enter a valid port.";
}

export function validateDomain(value: string | undefined) {
  if (value) {
    const regex = /^(?:[a-zA-Z0-9-]{1,63}\.){1,126}(?:[a-zA-Z]{2,63})$/;
    if (!regex.test(value)) {
      return "Enter a valid domain.";
    }
  }
}

export function validateLabel(value: string | undefined) {
  if (value && value.length > 32) {
    return "Allowed up to 32 characters.";
  }
}

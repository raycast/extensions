export const transformDefaultValue = (value: unknown) => {
  if (value === undefined) {
    return "-";
  }

  if (Array.isArray(value) && value.length === 0) {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  if (typeof value === "string" && !value.length) {
    return "-";
  }

  return value as string | number;
};

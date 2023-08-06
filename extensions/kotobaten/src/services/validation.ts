export const validateRequired = (value: string, propertyName: string) => {
  if (value.length < 1) {
    return `${propertyName} is required.`;
  }

  return undefined;
};

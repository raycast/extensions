export const thresholdValidation = (value?: string) => {
  if (!value) {
    return "The threshold is required.";
  }
  if (isNaN(parseFloat(value))) {
    return "The threshold must be a number.";
  }
  return undefined;
};

export const validateJSON = (value: string | undefined): string | undefined => {
  if (!value || value.trim() === "") {
    return "JSON is required";
  }
  try {
    JSON.parse(value.trim());
    return undefined;
  } catch (e) {
    return (e as SyntaxError).message;
  }
};

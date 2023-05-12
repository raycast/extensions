export const urlType =
  (required = false) =>
  (value: string | undefined) => {
    if (required && !value?.trim()) {
      return "Field is required";
    }
    try {
      new URL(value || "");
      return undefined;
    } catch (e) {
      if (!value?.trim() && !required) {
        return;
      }
      return "Invalid URL";
    }
  };

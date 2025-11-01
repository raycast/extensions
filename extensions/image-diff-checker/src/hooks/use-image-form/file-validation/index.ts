const checkExtension = (filePath: string) => {
  const ACCEPTED_IMAGE_TYPES = ["jpeg", "jpg", "png", "gif"];

  const ext = filePath.split(".").pop()?.toLowerCase();
  return ext ? ACCEPTED_IMAGE_TYPES.includes(ext) : false;
};

export const fileValidation = (value?: string[]) => {
  if (!value) return "The item is required.";
  if (value?.length === 0) return "The item is required.";
  const isValid = checkExtension(value[0]);
  if (!isValid) return "Invalid file type.";
  return undefined;
};

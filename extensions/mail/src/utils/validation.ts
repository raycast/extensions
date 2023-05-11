import emailRegex from "email-regex";
import { formatFileSize, getSizeSync, maximumFileSize } from "./finder";

export const required = (value: unknown) => {
  let isValid = true;

  if (Array.isArray(value) && (!value || !value.length)) {
    isValid = false;
  }

  if (typeof value === "string" && (!value || !value.trim().length)) {
    isValid = false;
  }

  if (value === null || value === undefined) {
    isValid = false;
  }

  return isValid ? undefined : "This field is required";
};

export const email = (value?: string) => {
  return value != null && emailRegex({ exact: true }).test(value) ? undefined : "Invalid email address";
};

export const emails = (value?: string) => {
  const errors = value
    ?.split(",")
    .map((recipient: string) => {
      const trimmedRecipient = recipient.trim();
      if (trimmedRecipient && !emailRegex({ exact: true }).test(trimmedRecipient)) {
        return "Invalid email address";
      }

      return undefined;
    })
    .filter((x) => x);

  return errors?.[0];
};

export const maxFileSize = (attachments?: string[]) => {
  if (!attachments?.length) {
    return undefined;
  }

  const size = getSizeSync(attachments);
  return maximumFileSize.value < size
    ? `Total file size is ${formatFileSize(size)} which exceeds the maximum file size of ${maximumFileSize.label}`
    : undefined;
};

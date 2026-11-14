import { formatFileSize, getSizeSync, maximumFileSize } from "./finder";

// https://colinhacks.com/essays/reasonable-email-regex
const emailRegex = /^([A-Z0-9_+-]+\.?)*[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

const required = (value: unknown) => {
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

// Extracts raw email address from potential RFC 5322 format: "Name <email@domain.com>" or "email@domain.com"
export const extractEmailAddress = (value: string): string => {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
};

const email = (value?: string) => {
  if (value == null) return "Invalid email address";
  const address = extractEmailAddress(value);
  return emailRegex.test(address) ? undefined : "Invalid email address";
};

const emails = (value?: string) => {
  const errors = value
    ?.split(",")
    .map((recipient: string) => {
      const trimmedRecipient = recipient.trim();
      const address = extractEmailAddress(trimmedRecipient);
      if (trimmedRecipient && !emailRegex.test(address)) {
        return "Invalid email address";
      }

      return undefined;
    })
    .filter((x) => x);

  return errors?.[0];
};

const maxFileSize = (attachments?: string[]) => {
  if (!attachments?.length) {
    return undefined;
  }

  const size = getSizeSync(attachments);
  return maximumFileSize.value < size
    ? `Total file size is ${formatFileSize(size)} which exceeds the maximum file size of ${maximumFileSize.label}`
    : undefined;
};

export const Validation = Object.freeze({
  required,
  email,
  emails,
  maxFileSize,
});

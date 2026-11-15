const ERROR_MSG_VALUE_EMPTY = "Please enter a value.";
const ERROR_MSG_VALUE_URL = "Must be a valid http:// or https:// URL.";
const ERROR_MSG_VALUE_NAME = "This name can't be use. Chose a different one.";

/**
 * Validation for `endpoint` value.
 *
 * @param value - OAuth2 Endpoint.
 *
 * @returns Error message if value is invalid.
 */
export const ValidateEndpoint = (value?: string): string | undefined => {
  if (!value) return ERROR_MSG_VALUE_EMPTY;

  /* Check if is a valid URL */
  try {
    const url = new URL(value);

    /* Check Proto */
    if (url.protocol !== "http:" && url.protocol !== "https:") return ERROR_MSG_VALUE_URL;
  } catch (e) {
    const error = e instanceof Error ? e : new TypeError("Invalid URL", { cause: e });

    if ("code" in error && error.code === "ERR_INVALID_URL") return ERROR_MSG_VALUE_URL;

    return error.message;
  }
};

/**
 * Validation for `name` value.
 *
 * @param value - Glpi server name.
 *
 * @returns Error message if value is invalid.
 */
export const ValidateName = (value?: string): string | undefined => {
  if (!value) return ERROR_MSG_VALUE_EMPTY;
  if (value.toLowerCase() === "all") return ERROR_MSG_VALUE_NAME;
};

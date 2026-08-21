import { CONNECTABLE_SCHEME_LIST, isConnectableUrl } from "../url-scheme";

/**
 * Required, counting a value of only spaces as missing. `FormValidation.Required` accepts one,
 * which would save a connection whose row renders with an empty title.
 */
export function requiredText(value: string | undefined): string | undefined {
  return value?.trim() ? undefined : "Required";
}

/** An address this extension can open, so a row never hands an unrelated scheme to another app. */
export function connectableUrl(value: string | undefined): string | undefined {
  const missing = requiredText(value);
  if (missing || !value) return missing;
  return isConnectableUrl(value) ? undefined : `Must start with ${CONNECTABLE_SCHEME_LIST}`;
}

/**
 * An optional port, which when given has to be a number a URL authority can carry. Anything else
 * would be spliced in after the colon and change which host or port the URL addresses.
 */
export function optionalPort(value: string | undefined): string | undefined {
  const port = value?.trim();
  if (!port) return undefined;
  return /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535
    ? undefined
    : "Must be a number between 1 and 65535";
}

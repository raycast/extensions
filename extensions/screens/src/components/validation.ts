import { isAuthorityHost } from "../authority";
import { isValidPort } from "../connect";
import { CONNECTABLE_SCHEME_LIST, isConnectableUrl } from "../url-scheme";

const BARE_HOST = "Enter the host on its own, without a user, port, or path";

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
  return isValidPort(port) ? undefined : "Must be a number between 1 and 65535";
}

/**
 * A host on its own. This field supplies the authority of a URL built from separate parts, so a
 * value carrying its own user, port, or path would address a machine other than the one named.
 */
export function connectableHost(value: string | undefined): string | undefined {
  const missing = requiredText(value);
  if (missing || !value) return missing;
  return isAuthorityHost(value) ? undefined : BARE_HOST;
}

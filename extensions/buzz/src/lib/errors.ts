/**
 * The one way this extension turns a caught `unknown` into text for a toast or
 * an error view.
 *
 * A rejection is not guaranteed to be an Error: `fetch`, the relay plumbing and
 * third-party code can all reject with a plain string or an object, and those
 * still have to read as something rather than "[object Object]" appearing with
 * no explanation or the reason being dropped entirely. Error messages from this
 * codebase never carry the private key.
 */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

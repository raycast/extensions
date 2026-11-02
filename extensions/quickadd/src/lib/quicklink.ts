/**
 * Raycast fills this from the Quicklink's inline argument. json-stringify
 * quotes the text and escapes `"` and `\` so the context stays valid JSON.
 * Raycast then percent-encodes it as it does every Quicklink argument; adding
 * `| percent-encode` would encode it twice.
 */
export const ARGUMENT_PLACEHOLDER = "{argument | json-stringify}";

/**
 * A deeplink whose context is `context` plus `value` set to the Quicklink's
 * argument. `commandLink` is the command's deeplink without a query.
 */
export function quicklinkWithArgument(
  commandLink: string,
  context: { vaultPath: string; choiceId: string },
): string {
  const head = JSON.stringify(context).slice(0, -1);
  return `${commandLink}?context=${encodeURIComponent(`${head},"value":`)}${ARGUMENT_PLACEHOLDER}${encodeURIComponent("}")}`;
}

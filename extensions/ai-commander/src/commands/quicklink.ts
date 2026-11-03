/**
 * `createDeeplink` reads `package.json` from disk on every call, which is too much for each row of a list on each
 * render. The list creates one base link and adds the context here, in the format the Raycast docs define: a
 * URL-encoded JSON object in the `context` query parameter.
 */
export function promptDeeplink(baseLink: string, promptId: string): string {
  return `${baseLink}?context=${encodeURIComponent(JSON.stringify({ promptId }))}`;
}

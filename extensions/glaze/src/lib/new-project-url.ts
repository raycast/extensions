export function newProjectUrl(
  scheme: "glaze" | "glaze-internal",
  prompt: string,
): string {
  const idea = prompt;
  if (!idea.trim()) throw new Error("Enter an idea for your app.");
  if (Buffer.byteLength(idea) > 65536)
    throw new Error("Keep your app idea under 64 KB.");
  // Swift URLComponents does not decode form-style '+' spaces. Encode the prompt
  // directly so spaces, literal plus signs, Unicode, and newlines survive intact.
  return `${scheme}://new?prompt=${encodeURIComponent(idea)}`;
}

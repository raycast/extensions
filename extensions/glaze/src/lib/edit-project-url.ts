export function editProjectUrl(
  scheme: "glaze" | "glaze-internal",
  projectPath: string,
  appId?: string,
  prompt?: string,
): string {
  const params = new URLSearchParams({ path: projectPath });
  if (appId) params.set("appId", appId);
  if (prompt !== undefined) {
    if (!prompt.trim()) throw new Error("Enter the changes you want to make.");
    if (Buffer.byteLength(prompt) > 65536)
      throw new Error("Keep your request under 64 KB.");
    params.set("prompt", prompt);
  }
  // Swift URLComponents preserves form-encoded + characters as literal pluses.
  return `${scheme}://edit-app?${params.toString().replaceAll("+", "%20")}`;
}

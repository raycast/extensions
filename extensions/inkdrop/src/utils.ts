export const truncateBody = (body: string, maxChars: number) => {
  if (body.length <= maxChars) return body;
  const lastNewline = body.lastIndexOf("\n", maxChars);
  const truncated = lastNewline > 0 ? body.slice(0, lastNewline) : body.slice(0, maxChars);
  const fenceCount = (truncated.match(/^```/gm) || []).length;
  const closeFence = fenceCount % 2 !== 0 ? "\n```" : "";
  return truncated + closeFence;
};

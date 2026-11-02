/** Remove only the destination phrase identified by the routing AI. */
export function editProjectPrompt(
  originalRequest: string,
  projectReference: string,
): string {
  if (
    typeof originalRequest !== "string" ||
    typeof projectReference !== "string"
  ) {
    throw new Error(
      "Provide originalRequest and projectReference separately. Copy the request verbatim and extract its target-project phrase.",
    );
  }
  if (!originalRequest.trim())
    throw new Error("Enter the changes you want to make.");
  if (Buffer.byteLength(originalRequest) > 65536)
    throw new Error("Keep your request under 64 KB.");
  if (projectReference === "") return originalRequest;
  if (!projectReference.trim())
    throw new Error(
      "projectReference must identify the target project, or be an empty string.",
    );

  const start = originalRequest.indexOf(projectReference);
  if (start === -1 || start !== originalRequest.lastIndexOf(projectReference)) {
    throw new Error(
      "projectReference must be a unique, exact substring of originalRequest. Include adjacent routing punctuation if needed to distinguish it from quoted text. No request was sent; correct the inputs and retry.",
    );
  }

  let before = originalRequest.slice(0, start);
  let after = originalRequest.slice(start + projectReference.length);
  // Repair only the join left by deletion. Never paraphrase the change request
  // or remove other mentions of an app (which may be part of a requirement).
  if (!before.trim()) {
    after = after.replace(/^[ \t]*[,;:]?[ \t]*/, "");
  } else if (!after.trim()) {
    before = before.replace(/[ \t]+$/, "");
  } else if (/[ \t]$/.test(before)) {
    if (/^[ \t]/.test(after)) after = after.replace(/^[ \t]+/, "");
    else if (/^[,.;!?]/.test(after)) before = before.replace(/[ \t]+$/, "");
  } else if (/[\p{L}\p{N}]$/u.test(before) && /^[\p{L}\p{N}]/u.test(after)) {
    after = ` ${after}`;
  }
  const prompt = before + after;
  if (!prompt.trim())
    throw new Error(
      "The project reference removed the entire request. Keep the requested changes in originalRequest and remove only the target-project phrase.",
    );
  return prompt;
}

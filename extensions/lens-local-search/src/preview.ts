export function escapeMarkdown(text: string) {
  return text.replace(/[\\`*_{}[\]()#+.!|<>$]/g, "\\$&");
}

export function previewText(
  text: string,
  kind: "doc" | "code",
  excerpt?: string,
) {
  const terms = [
    ...new Set([...(excerpt ?? "").matchAll(/«([^«»]+)»/gu)].map((m) => m[1])),
  ].filter((word) =>
    text.toLocaleLowerCase().includes(word.toLocaleLowerCase()),
  );
  const first = terms.length
    ? text.toLocaleLowerCase().indexOf(terms[0].toLocaleLowerCase())
    : 0;
  let start = Math.max(0, first - 800),
    end = Math.min(text.length, start + 12_000);
  if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start])) start--;
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end++;
  text =
    (start ? "…" : "") +
    text.slice(start, end) +
    (end < text.length ? "…" : "");
  const hint = previewHint(text, excerpt);
  // Local document content must not cause the renderer to fetch external images.
  if (kind === "doc") {
    const pattern = terms.length
      ? new RegExp(
          `(${terms.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
          "giu",
        )
      : undefined;
    return (
      hint +
      (pattern
        ? text
            .split(pattern)
            .map((part, i) =>
              i % 2 ? `**${escapeMarkdown(part)}**` : escapeMarkdown(part),
            )
            .join("")
        : escapeMarkdown(text))
    );
  }
  const fence = "`".repeat(
    Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)),
  );
  return hint + `${fence}\n${text}\n${fence}`;
}

export function previewHint(text: string, excerpt?: string) {
  const terms = [
    ...new Set([...(excerpt ?? "").matchAll(/«([^«»]+)»/gu)].map((m) => m[1])),
  ].filter((word) =>
    text.toLocaleLowerCase().includes(word.toLocaleLowerCase()),
  );
  return excerpt
    ? `### ${terms.length ? "Matched words" : "Related passage"}\n\n> ${excerpt
        .split(/(«[^«»]+»)/u)
        .map((part) => {
          const word =
            part.startsWith("«") && part.endsWith("»")
              ? part.slice(1, -1)
              : undefined;
          return word && terms.includes(word)
            ? `**${escapeMarkdown(word)}**`
            : escapeMarkdown(word ?? part);
        })
        .join("")
        .replace(/\n/g, "\n> ")}\n\n---\n\n`
    : "";
}

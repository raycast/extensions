/**
 * What the command may send: the clipboard's text, only when it is exactly one http(s) URL without sign-in details.
 *
 * A clipboard often holds secrets (a password, a token, a note), so nothing is ever pulled out of longer text and
 * nothing is "repaired": a text that isn't a lone URL as written is refused and never leaves the machine (spec 0143,
 * AC-3 and Decision 4).
 */

export type ClipboardUrl = { url: string } | { refused: "none" | "credentials" };

export function clipboardUrl(text: string | undefined): ClipboardUrl {
  const trimmed = text?.trim() ?? "";
  // Whitespace inside means prose or several URLs. `://` is required so that `https:example.com`, which `new URL()`
  // accepts, doesn't pass.
  if (trimmed === "" || /\s/.test(trimmed) || !/^https?:\/\//i.test(trimmed)) return { refused: "none" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { refused: "none" };
  }
  if (parsed.hostname === "") return { refused: "none" };

  // Read from the text, not from `parsed.username`: `https://@host/` has empty credentials there and is still a
  // URL that carries (empty) sign-in details. The authority ends at the first `/`, `?`, `#` or `\`.
  const authority = /^https?:\/\/([^/?#\\]*)/i.exec(trimmed)?.[1] ?? "";
  // `new URL("https:///path")` takes "path" as the host; as written, this text has none.
  if (authority === "") return { refused: "none" };
  if (authority.includes("@") || parsed.username !== "" || parsed.password !== "") return { refused: "credentials" };

  // The trimmed text itself is sent, so the destination is what the user copied, not `URL`'s rewrite of it.
  return { url: trimmed };
}

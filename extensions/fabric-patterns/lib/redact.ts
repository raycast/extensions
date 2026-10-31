/** Secrets that must never sit in a run record or a copied error (ISC-26.2); the background wrapper applies the same rules. */
export function redact(s: string): string {
  return (
    s
      .replace(/(sk-|gsk_|xai-|pplx-|AIza)[A-Za-z0-9_-]+/g, "$1[REDACTED]")
      // Values stop at ASCII whitespace, newlines included: the wrapper's sed is line-based, and a
      // value that ran on would swallow the next line's label and leak its key. Not `\s`: the
      // wrapper's sed runs in the C locale, where NBSP and other Unicode spaces are value bytes.
      .replace(/([Bb]earer )[^ \t\n\r\v\f"',]+/g, "$1[REDACTED]")
      // The label is capped at 64 letters: unbounded, a long run of letters rescanned to its end
      // from every start (200 KB of stderr took 33 s), and this runs on every foreground run.
      .replace(
        /(([A-Za-z_-]{0,64}(key|token|secret|password))["']?[ \t]*[:=][ \t]*["']?)[^ \t\n\r\v\f"',}]+/gi,
        "$1[REDACTED]",
      )
  );
}

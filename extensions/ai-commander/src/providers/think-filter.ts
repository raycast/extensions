const OPEN_TAG = "<think>";
const CLOSE_TAG = "</think>";

/** Length of the longest end of `text` that could still grow into `tag`. */
function partialTagLength(text: string, tag: string): number {
  for (let length = Math.min(tag.length - 1, text.length); length > 0; length--) {
    if (text.endsWith(tag.slice(0, length))) return length;
  }
  return 0;
}

/**
 * Streaming state machine that removes `<think>…</think>` from model text.
 *
 * Only a possible tag prefix is ever held back (at most seven characters), so text reaches the UI without delay and
 * the cost per chunk does not depend on how much text came before. Reasoning inside a tag is discarded immediately.
 *
 * An unclosed `<think>` drops everything after it: leaking reasoning is worse than losing a truncated answer.
 */
export class ThinkFilter {
  private inside = false;
  private held = "";
  /** Models put blank lines after `</think>`; those would become leading whitespace in the result. */
  private skipWhitespace = false;

  /** Returns the visible part of `chunk`. */
  push(chunk: string): string {
    let text = this.held + chunk;
    this.held = "";
    let visible = "";

    for (;;) {
      if (this.skipWhitespace) {
        text = text.trimStart();
        if (text === "") return visible;
        this.skipWhitespace = false;
      }
      const tag = this.inside ? CLOSE_TAG : OPEN_TAG;
      const index = text.indexOf(tag);
      if (index < 0) break;
      if (!this.inside) visible += text.slice(0, index);
      text = text.slice(index + tag.length);
      this.inside = !this.inside;
      this.skipWhitespace = !this.inside;
    }

    const keep = partialTagLength(text, this.inside ? CLOSE_TAG : OPEN_TAG);
    if (!this.inside) visible += text.slice(0, text.length - keep);
    this.held = keep === 0 ? "" : text.slice(text.length - keep);
    return visible;
  }

  /** True when the stream ended inside a block, so the text after `<think>` is missing. */
  get unclosed(): boolean {
    return this.inside;
  }

  /** Call once at the end of the stream. A held prefix that never became a tag was ordinary text. */
  flush(): string {
    const rest = this.inside ? "" : this.held;
    this.held = "";
    return rest;
  }
}

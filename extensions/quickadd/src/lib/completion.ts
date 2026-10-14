const TAG_CHAR = /[\p{L}\p{N}_\-/#]/u;

function insertion(
  prev: string,
  next: string,
): { at: number; text: string } | undefined {
  if (next.length <= prev.length) return undefined;
  let p = 0;
  while (p < prev.length && prev[p] === next[p]) p++;
  let s = 0;
  while (
    p + s < prev.length &&
    prev[prev.length - 1 - s] === next[next.length - 1 - s]
  ) {
    s++;
  }
  if (prev.length - p - s !== 0) return undefined;
  return { at: p, text: next.slice(p, next.length - s) };
}

export function linkTriggerAt(prev: string, next: string): number | undefined {
  const edit = insertion(prev, next);
  if (!edit) return undefined;
  const end = edit.at + edit.text.length;
  if (next.slice(end - 2, end) !== "[[" || next[end - 3] === "[") {
    return undefined;
  }
  return end - 2;
}

export function tagTriggerAt(prev: string, next: string): number | undefined {
  const edit = insertion(prev, next);
  if (edit?.text !== "#") return undefined;
  const before = next.slice(0, edit.at);
  if (TAG_CHAR.test(before.slice(-1))) return undefined;
  const line = before.slice(before.lastIndexOf("\n") + 1);
  if (line.lastIndexOf("[[") > line.lastIndexOf("]]")) return undefined;
  return edit.at;
}

export function insertLink(value: string, at: number, text: string): string {
  return `${value.slice(0, at)}[[${text}]]${value.slice(at + 2)}`;
}

export function insertTag(value: string, at: number, tag: string): string {
  const rest = value.slice(at + 1);
  const separator = /^\s/.test(rest) ? "" : " ";
  return `${value.slice(0, at)}#${tag}${separator}${rest}`;
}

export function safeComponent(value: string): string {
  const cleaned = Array.from(value.trim())
    .map((character) => (/[\p{L}\p{N}_-]/u.test(character) ? character : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return (cleaned.length > 0 ? cleaned : "clip").slice(0, 80);
}

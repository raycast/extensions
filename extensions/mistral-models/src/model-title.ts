const words: Record<string, string> = {
  nemo: "NeMo",
  fim: "FIM",
  api: "API",
};

/** Format catalog slugs without changing the identifier used for inference. */
export function modelTitle(id: string, name?: string): string {
  const label = name?.trim() || id;
  // Keep curated upstream display names and opaque fine-tuning identifiers intact.
  if (/\s/.test(label) || label.includes(":")) return label;

  let slug = label;
  let suffix = "";
  if (slug.endsWith("-latest")) {
    slug = slug.slice(0, -7);
    suffix = " (Latest)";
  } else {
    const release = slug.match(/-(\d{4})$/);
    if (release) {
      slug = slug.slice(0, -5);
      suffix = ` (${release[1]})`;
    }
  }

  slug = slug.replace(/\b(\d+)-(\d+)\b/g, "$1.$2");
  return (
    slug
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => {
        if (/^\d+(?:x\d+)?b$/i.test(word)) return word.replace(/b$/i, "B");
        return words[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ") + suffix
  );
}

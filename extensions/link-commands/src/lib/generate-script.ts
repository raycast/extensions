const FALLBACK_LINK_ICON = "https://api.iconify.design/mingcute/link-line.svg";

const FALLBACK_FOLDER_ICON = "https://api.iconify.design/mingcute/folder-line.svg";

/**
 * A placeholder cannot span lines — excluding the newline is what stops `{foo\nopen …\n#}` being
 * captured as one token in the first place, before any escaping gets a chance to matter.
 */
const PLACEHOLDER_PATTERN = /\{([^}\n\r]+)\}/;

/**
 * Every `@raycast.*` value is written into a single comment line, so a newline in one ends the
 * comment and turns whatever follows into an executable line of the generated script. Raycast reads
 * a header value to end-of-line regardless, so a newline can never carry meaning here — collapsing
 * it loses nothing and closes the injection for every field at once, not just the one that was found.
 */
const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export type ScriptDraft = {
  title: string;
  target: string;
  /** `work` becomes a `@work · ` prefix on the title and a `work.` prefix on the filename. */
  environment?: string;
  /** The brand — `YouTube`, `The Orchard`. Defaults to the target's domain, humanised. */
  packageName?: string;
  /** `media` becomes ` · #media` on the subtitle. Never on the title. */
  category?: string;
  application?: string;
  /**
   * Absolute path to a native app that stands in for the target wherever it is installed. Its presence
   * is what turns a plain opener into a surface router: the script opens the app where it is present and
   * the target where it is not, so one command serves machines that differ in what is installed.
   */
  desktopApplication?: string;
  author?: string;
  authorURL?: string;
  iconReference?: string;
};

const EDGE_WORDS = new Set(["from", "in", "to", "with", "on", "at", "by", "the", "a", "an", "for", "of"]);

/**
 * Accents are decomposed and their marks dropped, so `En Société` slugs to `en-societe` rather than
 * `en-soci-t`. Stripping non-ASCII without this loses the letter along with its accent.
 */
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/→/g, " to ")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const findPlaceholder = (target: string) => target.match(PLACEHOLDER_PATTERN)?.[1];

export const domainOf = (target: string) => {
  if (!/^https?:\/\//i.test(target)) return undefined;

  try {
    return new URL(target).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
};

/**
 * The registrable domain cannot be taken as "the last two labels": `amazon.co.uk` would reduce to
 * `co`. Resolving it properly needs the Public Suffix List, which is far too much weight for a
 * default value, so the common second-level suffixes are listed instead. A suffix missing from here
 * produces a slightly-off suggestion in a field the user can edit, never a wrong file.
 */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "co.nz",
  "co.jp",
  "co.kr",
  "com.br",
  "com.cn",
  "co.in",
  "com.mx",
  "com.tr",
  "com.sg",
  "com.hk",
  "com.tw",
  "com.pl",
  "co.za",
  "co.il",
]);

/** `app.raindrop.io` → `Raindrop`. A suggestion only — the field stays editable. */
export const brandFor = (target: string) => {
  const host = domainOf(target);
  if (!host) return undefined;

  const labels = host.replace(/:\d+$/, "").split(".");
  if (labels.length < 2) return undefined;

  const lastTwo = labels.slice(-2).join(".");
  const main = MULTI_PART_SUFFIXES.has(lastTwo) ? labels.at(-3) : labels.at(-2);
  if (!main) return undefined;

  return main
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const isPath = (target: string) => target.startsWith("~") || target.startsWith("/");

export const defaultIconFor = (target: string) => (isPath(target) ? FALLBACK_FOLDER_ICON : FALLBACK_LINK_ICON);

const brandOf = (draft: ScriptDraft) => draft.packageName?.trim() || brandFor(draft.target);

/** The title with the brand's own words removed, and dangling prepositions trimmed. */
const detailOf = (title: string, brand: string | undefined) => {
  const brandWords = new Set(brand ? slugify(brand).split("-") : []);
  let words = slugify(title)
    .split("-")
    .filter(Boolean)
    .filter((word) => !brandWords.has(word));

  while (words.length && EDGE_WORDS.has(words[words.length - 1])) words = words.slice(0, -1);

  return words.join("-");
};

/**
 * `scope.brand.detail` — the filename is derived from the metadata rather than typed, so a command
 * cannot drift from its own header. `detail` is omitted when the title is just the brand, which is
 * why a plain opener is `netflix.sh` and not `netflix.netflix.sh`.
 */
export const scriptFilename = (draft: ScriptDraft) => {
  const brand = brandOf(draft);
  const parts = [
    draft.environment?.trim() ? slugify(draft.environment) : undefined,
    brand ? slugify(brand) : slugify(draft.title),
    brand ? detailOf(draft.title, brand) || undefined : undefined,
  ].filter(Boolean);

  return `${parts.join(".")}.sh`;
};

/**
 * `percentEncoded` hands the encoding to Raycast, which is why there is no `jq` call here. Substituting
 * an argument verbatim truncates any query containing `&` or `#`, so a search command that skips
 * encoding looks correct until the first query with an ampersand in it quietly loses half its terms.
 */
/**
 * The target is free text that ends up inside a double-quoted string in a file written executable, so it
 * has to be escaped rather than trusted. Without this a URL containing `$` is expanded by zsh at run time,
 * one containing a quote breaks out of the string, and a crafted one appends its own commands to the script.
 */
const escapeForShell = (value: string) => value.replace(/([\\"`$])/g, "\\$1");

/**
 * A native app cannot serve a search: `open -a` takes no query, so a target carrying a `{query}`
 * placeholder has nothing an app could stand in for. A non-URL target is excluded for the same kind of
 * reason — a folder has no web equivalent to fall back to.
 */
const routerAppOf = (draft: ScriptDraft) =>
  draft.desktopApplication && !findPlaceholder(draft.target) && /^https?:\/\//i.test(draft.target)
    ? draft.desktopApplication
    : undefined;

/**
 * The app is opened by its own path rather than by a name derived from it. A basename is not an identity:
 * two bundles can share one, and a renamed or unregistered app resolves to something else or to nothing,
 * so `open -a` could miss the very bundle the presence check just confirmed.
 *
 * No argument, and so no dropdown. Raycast has to raise the launcher to render an argument field, which
 * costs a command its hotkey — an optional argument still prompts, it only permits an empty answer. A
 * router's whole value is firing without ceremony, so forcing a surface belongs on a second command
 * rather than on this one.
 */
const routerBody = (draft: ScriptDraft, appPath: string) => {
  const openWeb = draft.application ? `open -a "${escapeForShell(draft.application)}" "$url"` : 'open "$url"';

  return [
    `url="${escapeForShell(draft.target)}"`,
    `app="${escapeForShell(appPath)}"`,
    "",
    "if [[ -d $app ]]; then",
    '  open "$app"',
    "else",
    `  ${openWeb}`,
    "fi",
  ].join("\n");
};

const buildBody = (draft: ScriptDraft) => {
  const placeholder = findPlaceholder(draft.target);

  // A URL or a path cannot legitimately contain a raw newline, and one inside the quoted argument
  // would produce a command spanning lines — harmless in zsh, but only by virtue of quoting rules
  // it would be unwise to depend on. Stripped here so the body is always a single line.
  draft = { ...draft, target: singleLine(draft.target) };

  // Escaping happens before the substitutions below, so that the `$1` and `$HOME` this deliberately emits
  // survive while the target's own `$` characters do not. A literal "$1" replacement string would be read
  // as a capture-group reference and expand to the placeholder's own name, hence the function form.
  const target = escapeForShell(draft.target);

  const routerApp = routerAppOf(draft);
  if (routerApp) return routerBody(draft, routerApp);

  if (placeholder) return `open "${target.replace(PLACEHOLDER_PATTERN, () => "$1")}"`;
  if (draft.application) return `open -a "${escapeForShell(draft.application)}" "${target}"`;
  if (draft.target.startsWith("~")) return `open "$HOME${escapeForShell(draft.target.slice(1))}"`;

  return `open "${target}"`;
};

export const buildScript = (draft: ScriptDraft) => {
  const placeholder = findPlaceholder(draft.target);
  const environment = draft.environment?.trim();
  const category = draft.category?.trim().replace(/^#/, "");
  const brand = brandOf(draft);

  const title = environment ? `@${environment} · ${draft.title}` : draft.title;
  const subtitle = [brand, category ? `#${category}` : undefined].filter(Boolean).join(" · ");
  const icon = draft.iconReference ?? defaultIconFor(draft.target);

  const lines = [
    "#!/usr/bin/env zsh",
    "",
    "# Required parameters:",
    "# @raycast.schemaVersion 1",
    `# @raycast.title ${singleLine(title)}`,
    "# @raycast.mode silent",
    "",
    "# Optional parameters:",
    `# @raycast.icon ${singleLine(icon)}`,
  ];

  if (subtitle) lines.push(`# @raycast.packageName ${singleLine(subtitle)}`);
  if (placeholder) {
    // The argument is JSON, so it is serialised rather than quoted by hand — that escapes the quotes
    // and control characters a hand-built string would let straight through.
    lines.push(
      `# @raycast.argument1 { "type": "text", "placeholder": ${JSON.stringify(placeholder)}, "percentEncoded": true }`,
    );
  }

  if (draft.author || draft.authorURL) {
    lines.push("", "# Documentation:");
    if (draft.author) lines.push(`# @raycast.author ${singleLine(draft.author)}`);
    if (draft.authorURL) lines.push(`# @raycast.authorURL ${singleLine(draft.authorURL)}`);
  }

  lines.push("", buildBody(draft), "");

  return { filename: scriptFilename(draft), contents: lines.join("\n") };
};

/**
 * @module predicate-validator
 *
 * Conservative validator and readable-interpretation parser for Spotlight
 * predicate strings used in the find-files AI search pipeline.
 *
 * Only a strictly-defined subset of Spotlight syntax is allowed. Anything
 * outside that subset is rejected before the predicate reaches native search.
 * The same validation is applied to both AI-generated and user-edited
 * predicates.
 */

// ── Validation types ──

export type ValidationResult = { valid: true } | { valid: false; error: string };

// ── Allowed / forbidden sets ──

const ALLOWED_OPERATORS = ["==", ">=", "<=", ">", "<"] as const;

const ALLOWED_ATTRIBUTES = new Set([
  "kMDItemFSName",
  "kMDItemContentType",
  "kMDItemContentTypeTree",
  "kMDItemFSContentChangeDate",
  "kMDItemContentModificationDate",
  "kMDItemContentCreationDate",
  "kMDItemFSIsDirectory",
]);

const FORBIDDEN_ATTRIBUTES = new Set(["kMDItemPath", "kMDItemKind"]);

const FORBIDDEN_OPERATORS = ["LIKE", "CONTAINS", "BEGINSWITH", "ENDSWITH", "MATCHES"] as const;

const FORBIDDEN_MODIFIERS = ["[c]", "[d]", "[l]", "[n]"];

const DATE_ATTRIBUTES = new Set([
  "kMDItemFSContentChangeDate",
  "kMDItemContentModificationDate",
  "kMDItemContentCreationDate",
]);

// ── Content-type to human-readable label map ──

const CONTENT_TYPE_LABELS: Record<string, string> = {
  "public.png": "PNG",
  "public.jpeg": "JPEG",
  "public.heic": "HEIC",
  "com.compuserve.gif": "GIF",
  "com.adobe.pdf": "PDF",
  "public.movie": "Movie",
  "public.audio": "Audio",
  "public.source-code": "Source Code",
  "public.spreadsheet": "Spreadsheet",
  "public.presentation": "Presentation",
  "public.archive": "Archive",
  "public.folder": "Folder",
};

const CONTENT_TYPE_TREE_LABELS: Record<string, string> = {
  "public.image": "Image",
  "public.movie": "Movie",
  "public.audio": "Audio",
  "com.adobe.pdf": "PDF",
  "public.source-code": "Source Code",
  "public.spreadsheet": "Spreadsheet",
  "public.presentation": "Presentation",
  "public.archive": "Archive",
  "public.folder": "Folder",
};

// ── Tokenizer ──

interface PredicateAtom {
  attribute: string;
  operator: string;
  value: string;
}

/**
 * Split a compound predicate on `&&` and parse each atom.
 * Handles quoted values containing `&&`.
 */
function tokenizePredicate(predicate: string): PredicateAtom[] {
  // Split on && that are NOT inside single-quoted strings
  const atoms: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < predicate.length; i++) {
    const ch = predicate[i];
    if (ch === "'") {
      inQuote = !inQuote;
      current += ch;
    } else if (!inQuote && predicate[i] === "&" && predicate[i + 1] === "&") {
      atoms.push(current.trim());
      current = "";
      i++; // skip second &
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    atoms.push(current.trim());
  }

  return atoms.map((atom) => parseAtom(atom)).filter((a): a is PredicateAtom => a !== null);
}

/**
 * Parse a single atom like `kMDItemFSName == '*.txt'`
 * or `kMDItemFSContentChangeDate >= $time.today(-7)`
 */
function parseAtom(atom: string): PredicateAtom | null {
  // Match: attribute, operator (possibly with modifier like [c]), value
  const match = atom.match(/^\s*(kMDItem\w+)\s+(==|>=|<=|>|<)(\[([cdln])\])?\s+(.+)\s*$/);

  if (!match) return null;

  return {
    attribute: match[1],
    operator: match[2],
    value: match[5].trim(),
  };
}

// ── Public API ──

/**
 * Validate a Spotlight predicate against the safe subset.
 *
 * Rules (conservative — reject anything not explicitly allowed):
 *  1. Non-empty string, max 400 chars, no null bytes
 *  2. Only ==, >=, <=, >, < operators
 *  3. Only allowed kMDItem attributes
 *  4. Only && compound operator
 *  5. No forbidden attributes (kMDItemPath, kMDItemKind)
 *  6. No forbidden operators (LIKE, CONTAINS, BEGINSWITH, ENDSWITH, MATCHES)
 *  7. No case/diacritic modifiers [c], [d], [l], [n]
 *  8. Values must be quoted strings, $time.* expressions, or 0/1 for kMDItemFSIsDirectory
 *
 * Returns `{valid: true}` or `{valid: false, error: "reason"}`.
 */
export function validatePredicate(predicate: string): ValidationResult {
  // 1. Basic string checks
  const normalized = predicate.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { valid: false, error: "Empty predicate" };
  }
  if (normalized.length > 400) {
    return { valid: false, error: "Predicate too long (max 400 characters)" };
  }
  if (normalized.includes("\0")) {
    return { valid: false, error: "Predicate contains null bytes" };
  }

  // 2. Check for forbidden operators
  const upper = normalized.toUpperCase();
  for (const op of FORBIDDEN_OPERATORS) {
    if (upper.includes(op)) {
      return {
        valid: false,
        error: `Forbidden operator: ${op}`,
      };
    }
  }

  // 3. Check for forbidden modifiers
  for (const mod of FORBIDDEN_MODIFIERS) {
    if (normalized.includes(mod)) {
      return {
        valid: false,
        error: `Forbidden modifier: ${mod}`,
      };
    }
  }

  // 4. Check for forbidden attributes
  for (const attr of FORBIDDEN_ATTRIBUTES) {
    if (normalized.includes(attr)) {
      return {
        valid: false,
        error: `Forbidden attribute: ${attr}`,
      };
    }
  }

  // 5. Check for || (OR) — only && is allowed
  if (normalized.includes("||")) {
    return {
      valid: false,
      error: "Forbidden operator: ||",
    };
  }

  // 6. Parse atoms and validate each
  const atoms = tokenizePredicate(normalized);

  if (atoms.length === 0) {
    return {
      valid: false,
      error: "Predicate does not contain valid Spotlight expressions",
    };
  }

  for (const atom of atoms) {
    // Check attribute is in allowed list
    if (!ALLOWED_ATTRIBUTES.has(atom.attribute)) {
      return {
        valid: false,
        error: `Disallowed attribute: ${atom.attribute}`,
      };
    }

    // Check operator is allowed
    if (!(ALLOWED_OPERATORS as readonly string[]).includes(atom.operator)) {
      return {
        valid: false,
        error: `Forbidden operator: ${atom.operator}`,
      };
    }

    // Validate values
    if (!isValidValue(atom)) {
      return {
        valid: false,
        error: `Invalid value for ${atom.attribute}: ${atom.value}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if a value is valid for a predicate atom.
 * Date attributes accept $time.today() / $time.today(-N) / $time.today(0).
 * kMDItemFSIsDirectory accepts 0/1 or true/false.
 * Other non-date attributes accept single-quoted strings.
 */
function isValidValue(atom: PredicateAtom): boolean {
  if (DATE_ATTRIBUTES.has(atom.attribute)) {
    // Allow $time.today(), $time.today(0), $time.today(-N)
    return /^\$time\.today\((-?\d+)\)$/.test(atom.value) || atom.value === "$time.today()";
  }

  if (atom.attribute === "kMDItemFSIsDirectory") {
    return /^(0|1|true|false)$/i.test(atom.value);
  }

  // Must be a single-quoted string
  return /^'.*'$/s.test(atom.value);
}

// ── Interpretation parser ──

/**
 * Parse a validated predicate into a human-readable interpretation label.
 *
 * Examples:
 *   `kMDItemContentType == 'public.png'`         → "File type: PNG"
 *   `kMDItemContentTypeTree == 'public.image'`   → "File type: Image"
 *   `kMDItemFSName == '*.txt'`                    → "Name matches: *.txt"
 *   `kMDItemFSContentChangeDate >= $time.today(-7)` → "Modified: last 7 days"
 *   Compound with `&&`                            → labels joined with ", "
 *   scopePath                                     → ", Location: <folder name>"
 *   Fallback                                      → "Custom search"
 */
export function parsePredicateInterpretation(predicate: string, scopePath: string): string {
  const normalized = predicate.replace(/\s+/g, " ").trim();
  if (!normalized) return "Custom search";

  const atoms = tokenizePredicate(normalized);
  if (atoms.length === 0) return "Custom search";

  const labels: string[] = [];

  for (const atom of atoms) {
    const label = interpretAtom(atom);
    if (label) labels.push(label);
  }

  let result = labels.length > 0 ? labels.join(", ") : "Custom search";

  // Append location from scopePath
  if (scopePath) {
    const folderName = scopePath.split("/").filter(Boolean).pop() ?? scopePath;
    result += `, Location: ${folderName}`;
  }

  return result;
}

function interpretAtom(atom: PredicateAtom): string | null {
  const { attribute, value } = atom;

  if (attribute === "kMDItemContentType") {
    const unquoted = unquote(value);
    const label = CONTENT_TYPE_LABELS[unquoted];
    return label ? `File type: ${label}` : `File type: ${unquoted}`;
  }

  if (attribute === "kMDItemContentTypeTree") {
    const unquoted = unquote(value);
    const label = CONTENT_TYPE_TREE_LABELS[unquoted];
    return label ? `File type: ${label}` : `File type: ${unquoted}`;
  }

  if (attribute === "kMDItemFSName") {
    const unquoted = unquote(value);
    if (unquoted.includes("*") || unquoted.includes("?")) {
      return `Name matches: ${unquoted}`;
    }
    return `Name: ${unquoted}`;
  }

  if (attribute === "kMDItemFSIsDirectory") {
    return /^(1|true)$/i.test(value) ? "Folders only" : "Files only";
  }

  if (DATE_ATTRIBUTES.has(attribute)) {
    return interpretDateValue(value);
  }

  return null;
}

function interpretDateValue(value: string): string {
  // $time.today() or $time.today(0) → today
  if (value === "$time.today()" || value === "$time.today(0)") {
    return "Modified: today";
  }

  // $time.today(-N) → last N days
  const match = value.match(/^\$time\.today\((-\d+)\)$/);
  if (match) {
    const days = Math.abs(parseInt(match[1], 10));
    return `Modified: last ${days} days`;
  }

  return "Modified: custom date";
}

function unquote(value: string): string {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

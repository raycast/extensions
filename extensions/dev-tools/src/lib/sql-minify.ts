// Minimal SQL minifier. Collapses runs of whitespace to a single space and
// optionally strips comments, while preserving string/identifier literals
// verbatim — so `--` or `/* */` appearing *inside* a quoted literal is never
// treated as a comment, and whitespace inside literals is never collapsed.
//
// A single forward scan tracks whether we're inside a `'...'`, `"..."`, or
// `` `...` `` literal (doubled-quote escapes handled), a `-- line comment`, or a
// `/* block comment */`. Caveat: dollar-quoted strings ($$...$$) and backslash
// escapes inside literals are not specially handled.

export interface SqlMinifyOptions {
  removeComments: boolean;
}

export function minifySql(sql: string, options: SqlMinifyOptions): string {
  if (!sql.trim()) return "";

  const n = sql.length;
  let out = "";
  // Collapsed whitespace is deferred: we only emit a single separating space
  // right before the next real character, which avoids leading/trailing spaces.
  let needSpace = false;

  const flushSpace = () => {
    if (needSpace) {
      if (out.length > 0) out += " ";
      needSpace = false;
    }
  };

  let i = 0;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "-" && next === "-") {
      let j = i + 2;
      while (j < n && sql[j] !== "\n") j++;
      if (!options.removeComments) {
        flushSpace();
        out += sql.slice(i, j) + "\n"; // keep the terminator so it stays a line comment
      } else if (out.length > 0) {
        needSpace = true;
      }
      i = j;
      continue;
    }

    if (ch === "/" && next === "*") {
      let j = i + 2;
      while (j < n && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
      j = Math.min(j + 2, n);
      if (!options.removeComments) {
        flushSpace();
        out += sql.slice(i, j);
      } else if (out.length > 0) {
        needSpace = true;
      }
      i = j;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2; // doubled-quote escape stays inside the literal
            continue;
          }
          j++;
          break;
        }
        j++;
      }
      flushSpace();
      out += sql.slice(i, j);
      i = j;
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f" || ch === "\v") {
      if (out.length > 0) needSpace = true;
      i++;
      continue;
    }

    flushSpace();
    out += ch;
    i++;
  }

  return out.trim();
}

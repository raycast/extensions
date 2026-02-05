/**
 * Converts dictionary XHTML (from DCSRecordCopyData) to Raycast-compatible markdown.
 * Uses the semantic CSS classes in the XHTML rather than regex heuristics on plain text.
 */

interface Token {
  type: "open" | "close" | "text" | "self-close";
  tag?: string;
  classes?: string[];
  text?: string;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<(\/?)([a-zA-Z:][a-zA-Z0-9:]*)((?:\s+[^>]*?)?)(\/?)\s*>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[5] !== undefined) {
      tokens.push({ type: "text", text: m[5] });
    } else if (m[1] === "/") {
      tokens.push({ type: "close", tag: m[2] });
    } else if (m[4] === "/") {
      tokens.push({ type: "self-close", tag: m[2] });
    } else {
      const classMatch = m[3].match(/class="([^"]*)"/);
      const classes = classMatch
        ? classMatch[1].split(/\s+/).filter(Boolean)
        : [];
      tokens.push({ type: "open", tag: m[2], classes });
    }
  }
  return tokens;
}

function hasClass(classes: string[], ...names: string[]): boolean {
  return names.some((n) => classes.includes(n));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

export function htmlToMarkdown(html: string): string {
  // Strip to body content
  const bodyStart = html.indexOf("<body>");
  const bodyEnd = html.indexOf("</body>");
  if (bodyStart >= 0 && bodyEnd > bodyStart) {
    html = html.slice(bodyStart + 6, bodyEnd);
  }

  const tokens = tokenize(html);
  const parts: string[] = [];
  const stack: string[][] = []; // class stack
  let examplesInSense = 0;
  let skippedExamples = 0;
  let inSkippedExample = false;
  let inExample = false;
  const MAX_EXAMPLES = 2;

  // Trim trailing whitespace from the last text part (fixes italic markers)
  function trimLast() {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].match(/\S/)) {
        parts[i] = parts[i].replace(/\s+$/, "");
        return;
      }
    }
  }

  for (const tok of tokens) {
    if (tok.type === "self-close") continue;

    if (tok.type === "open") {
      const cl = tok.classes || [];
      stack.push(cl);

      // Inside a skipped example, only track stack — push nothing
      if (inSkippedExample) continue;

      if (hasClass(cl, "hw")) {
        parts.push("\n## ");
      } else if (hasClass(cl, "ps", "pos")) {
        parts.push("\n\n*");
      } else if (hasClass(cl, "cnt")) {
        parts.push("*");
      } else if (hasClass(cl, "lev")) {
        parts.push("*");
      } else if (hasClass(cl, "exg")) {
        // Count at example-group level so translation is also skipped
        examplesInSense++;
        if (examplesInSense <= MAX_EXAMPLES) {
          inExample = true;
          parts.push("\n\n> ");
        } else {
          inSkippedExample = true;
          skippedExamples++;
        }
      } else if (hasClass(cl, "trg")) {
        // Separator between source example and translation
        if (inExample) parts.push(" — ");
      } else if (hasClass(cl, "xrg")) {
        // Cross-reference group: "▶ see also word"
        parts.push(" *→ ");
      } else if (hasClass(cl, "bold")) {
        parts.push("**");
      } else if (hasClass(cl, "gg")) {
        parts.push("*");
      } else if (hasClass(cl, "idm", "l")) {
        // Idiom / phrase sub-entry headword
        parts.push("\n\n**");
      }
      continue;
    }

    if (tok.type === "close") {
      const cl = stack.pop() || [];

      // Inside a skipped example, only handle exg close
      if (inSkippedExample) {
        if (hasClass(cl, "exg")) {
          inSkippedExample = false;
          inExample = false;
        }
        continue;
      }

      if (hasClass(cl, "hw")) {
        parts.push("\n");
      } else if (hasClass(cl, "ps", "pos")) {
        trimLast();
        parts.push("*\n");
      } else if (hasClass(cl, "cnt")) {
        trimLast();
        parts.push("* ");
      } else if (hasClass(cl, "lev")) {
        trimLast();
        parts.push("* ");
      } else if (hasClass(cl, "exg")) {
        inExample = false;
      } else if (hasClass(cl, "bold")) {
        parts.push("**");
      } else if (hasClass(cl, "gg")) {
        trimLast();
        parts.push("* ");
      } else if (hasClass(cl, "semb") || hasClass(cl, "se1")) {
        // End of sense — flush skipped example count
        if (skippedExamples > 0) {
          parts.push(`\n\n*… ${skippedExamples} more*\n`);
          skippedExamples = 0;
        }
        examplesInSense = 0;
      } else if (hasClass(cl, "gramb", "sg")) {
        // End of POS block — add separator
        parts.push("\n\n---\n");
        examplesInSense = 0;
        skippedExamples = 0;
      } else if (hasClass(cl, "xrg")) {
        trimLast();
        parts.push("*");
      } else if (hasClass(cl, "idm", "l")) {
        trimLast();
        parts.push("** ");
      }
      continue;
    }

    // Text node
    if (inSkippedExample) continue;

    const text = decodeEntities(tok.text || "");

    // Check if we're inside a sense number
    const currentClasses = stack.flat();
    if (currentClasses.includes("sn")) {
      const trimmed = text.trim();
      if (/^\d+$/.test(trimmed)) {
        parts.push(`\n\n**${trimmed}.** `);
      } else if (trimmed === "•" || trimmed === "·") {
        parts.push("\n• ");
      } else if (trimmed === "▸" || trimmed === "▹") {
        // Example marker — skip, formatting handled by exg class
      } else if (/^[a-z]$/.test(trimmed)) {
        parts.push(`\n\n\u00A0\u00A0\u00A0**${trimmed}.** `);
      }
      continue;
    }

    // Skip pipe characters in pronunciation brackets
    if (currentClasses.includes("gp") && /^\s*\|\s*$/.test(text)) {
      continue;
    }

    // Skip homograph numbers in headwords
    if (currentClasses.includes("ty_hom")) {
      continue;
    }

    // Skip cross-reference triangle (replaced by → in xrg handler)
    if (currentClasses.includes("t_triangle")) {
      continue;
    }

    // Section labels: IDIOMS, PHRASES, ORIGIN, etc.
    if (currentClasses.includes("x_xoLblBlk")) {
      const label = text.trim();
      if (label) parts.push(`\n\n---\n*${label}*\n`);
      continue;
    }

    parts.push(text);
  }

  // Flush any remaining skipped examples
  if (skippedExamples > 0) {
    parts.push(`\n\n*… ${skippedExamples} more*`);
  }

  let md = parts.join("");

  // Clean up excessive whitespace
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.replace(/[ \t]+/g, " ");
  // Clean up spaces around newlines
  md = md.replace(/ *\n */g, "\n");
  // Fix space between closing italic and punctuation: "* )" → "*)"
  md = md.replace(/\* ([)}\]>»›,;:])/g, "*$1");
  // Collapse duplicate separators
  md = md.replace(/(\n---\n)+/g, "\n---\n");
  // Remove trailing --- if it's the last thing
  md = md.replace(/\n---\n*$/, "");

  return md.trim();
}

/** Extract cross-reference target words from the XHTML */
export function htmlExtractRefs(html: string): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+title="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const word = m[1].trim();
    if (word && !seen.has(word.toLowerCase())) {
      seen.add(word.toLowerCase());
      refs.push(word);
    }
  }
  return refs;
}

/** Extract a brief definition snippet for the list subtitle */
export function htmlToBrief(html: string): string {
  // Strip to body
  const bodyStart = html.indexOf("<body>");
  const bodyEnd = html.indexOf("</body>");
  if (bodyStart >= 0 && bodyEnd > bodyStart) {
    html = html.slice(bodyStart + 6, bodyEnd);
  }

  const tokens = tokenize(html);
  const stack: string[][] = [];
  let result = "";
  let found = false;

  for (const tok of tokens) {
    if (found) break;
    if (tok.type === "self-close") continue;

    if (tok.type === "open") {
      stack.push(tok.classes || []);
      continue;
    }
    if (tok.type === "close") {
      stack.pop();
      continue;
    }

    const cl = stack.flat();
    // Look for the first definition or translation text
    if (cl.includes("df") || cl.includes("trans")) {
      const text = decodeEntities(tok.text || "").trim();
      if (text.length > 2) {
        result = text;
        found = true;
      }
    }
  }

  return result.slice(0, 80);
}

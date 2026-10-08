// ─────────────────────────────────────────────────────────────────────
// config-surgery.mjs — strict canonical TOML editor for switcheroo config.
//
// ARCHITECTURE:
//   1. Strict canonical scanner: only accepts plain [[section]] headers
//      with bare keys and one complete key = value per line. Rejects
//      quoted/dotted/nested headers, quoted/dotted/dashed keys, multiline
//      values/arrays/strings, continuation lines, inline comments, and
//      header trailing comments BEFORE any write.
//   2. Semantic postconditions: smol-toml is the semantic authority.
//      Every candidate output MUST parse and deep-equal the exact intended
//      one-array-entry add/update/delete in a structured clone of the
//      original. All other content must be invariant.
//   3. No parser grammar expansion or new dependency. smol-toml parses,
//      we edit text, smol-toml re-parses to verify.
//
// DESIGN BOUNDARY:
//   - Handles the 5 known array-of-table types only.
//   - Unknown top-level keys → refuse ALL writes.
//   - Any line the scanner can't classify as blank, full-line comment,
//     plain [[section]] header, or bare-key assignment → refuse.
//   - Comments between sections (full-line, outside blocks) are
//     preserved as separator bytes. Comments inside blocks → refuse.
//   - Never silently drop comments, fields, or reparent data.
//   - CRLF consistency: new/edited lines match the file's line ending.
// ─────────────────────────────────────────────────────────────────────

import * as TOML from "smol-toml";
import crypto from "crypto";

/** Known switcheroo top-level keys (all are array-of-tables). */
export const KNOWN_SECTION_TYPES = [
  "modifier_remap",
  "remap",
  "conditional_remap",
  "tap_hold",
  "chord",
];

// ── Schema: allowed keys per section type ──────────────────────────────

const SCHEMA_KEYS = {
  modifier_remap: ["from", "to"],
  remap: ["from", "to"],
  conditional_remap: ["modifier", "from", "to"],
  tap_hold: ["key", "tap", "hold", "timeout_ms"],
  chord: ["keys", "emit", "window_ms"],
};

// ── Strict canonical line classification ──────────────────────────────

/**
 * Classify a single line (with \r stripped) into a strict canonical
 * category. Returns an object describing the line type.
 *
 * Canonical grammar (intentionally tiny):
 *   - BLANK: empty or whitespace-only
 *   - COMMENT: starts with # (full-line comment)
 *   - HEADER: ^\[\[bare_key\]\]$ — no trailing comment, no spaces in key
 *   - ASSIGNMENT: ^bare_key\s*=\s*value$ — one complete assignment
 *   - Anything else → REJECT
 *
 * @param {string} line - line with \r stripped
 * @returns {{type: string, section?: string, key?: string, raw: string}}
 */
function classifyLine(line) {
  const raw = line;
  const trimmed = line.trim();

  if (trimmed === "") return { type: "blank", raw };

  if (trimmed.startsWith("#")) return { type: "comment", raw };

  // Array-of-tables header: [[bare_key]] with no trailing content
  // Must be exactly [[word]] — no spaces, no quotes, no dots, no comments
  const headerMatch = trimmed.match(/^\[\[([A-Za-z0-9_]+)\]\]$/);
  if (headerMatch) {
    return { type: "header", section: headerMatch[1], raw };
  }

  // Reject lines that look like headers but aren't canonical:
  // [[...]] with trailing content, quotes, dots, spaces, etc.
  if (/^\[\[/.test(trimmed) || /^\[/.test(trimmed)) {
    return { type: "reject", raw, reason: "non-canonical header or table" };
  }

  // Bare key assignment: bare_key = value (one complete assignment per line)
  // Key must be [A-Za-z0-9_]+ — no quotes, no dots, no dashes
  // Reject inline comments (# after value) — they would be lost on update.
  const assignMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (assignMatch) {
    const value = assignMatch[2];
    // Check for inline comment: a # outside a string value.
    // We check if there's a # after the value portion. Since we
    // don't parse string boundaries, we reject if # appears after
    // the first " that closes. Simplest: if # appears anywhere after
    // the value starts AND it's not inside a string, reject.
    // For canonical form, we reject any line containing # after =.
    if (value.includes("#")) {
      return { type: "reject", raw, reason: "inline comment after assignment" };
    }
    return {
      type: "assignment",
      key: assignMatch[1],
      value: assignMatch[2],
      raw,
    };
  }

  // Anything else: continuation lines, multiline strings, etc.
  return { type: "reject", raw, reason: "non-canonical line" };
}

/**
 * Scan the entire file into a structured model of blocks.
 *
 * A block is a [[section]] header followed by zero or more assignment
 * lines. Comments and blank lines between blocks are separators (not
 * part of any block). Comments/blank lines inside a block (between
 * header and assignments) cause rejection.
 *
 * @param {string} content - full file content
 * @returns {{ blocks: Array, separators: Array }}
 *   blocks: [{ section, startLine, endLine, assignments: [{key, value, line}] }]
 *   separators: lines that are blank or full-line comments (preserved)
 * @throws {Error} if any line is non-canonical
 */
export function scanCanonical(content) {
  const lines = content.split("\n").map((l) => l.replace(/\r$/, ""));
  const blocks = [];
  const separators = [];

  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const classified = classifyLine(lines[i]);

    if (classified.type === "reject") {
      throw new Error(
        `Config line ${i + 1} is not supported by the canonical editor: ${classified.reason}. ` +
          "Use Edit Config to update manually.",
      );
    }

    if (classified.type === "blank" || classified.type === "comment") {
      separators.push(i);
      // A blank or comment line after block content ends the block.
      // Comments between header and first assignment → reject.
      if (currentBlock !== null) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    if (classified.type === "header") {
      // Close any open block
      if (currentBlock !== null) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      currentBlock = {
        section: classified.section,
        startLine: i,
        endLine: i,
        assignments: [],
      };
      continue;
    }

    if (classified.type === "assignment") {
      if (currentBlock === null) {
        throw new Error(
          `Config line ${i + 1}: assignment outside any [[section]] block. ` +
            "Use Edit Config to update manually.",
        );
      }
      currentBlock.endLine = i;
      currentBlock.assignments.push({
        key: classified.key,
        value: classified.value,
        line: i,
      });
      continue;
    }
  }

  // Close any open block at EOF
  if (currentBlock !== null) {
    blocks.push(currentBlock);
  }

  return { blocks, separators };
}

/**
 * Find blocks of a specific section type from the scan.
 *
 * @param {Array} blocks - result from scanCanonical
 * @param {string} sectionType
 * @returns {Array} blocks matching the section type
 */
export function findBlocks(blocks, sectionType) {
  return blocks.filter((b) => b.section === sectionType);
}

// ── Serializer with strict validation ───────────────────────────────────

/**
 * Serialize a TOML basic string value with full escaping.
 * Rejects control characters (0x00-0x08, 0x0A-0x1F except 0x09 tab
 * is allowed in multiline but we don't support multiline).
 * @param {string} s
 * @returns {string}
 */
function serializeString(s) {
  if (typeof s !== "string") {
    throw new Error(
      `Cannot serialize non-string value as TOML string: ${String(s)}`,
    );
  }
  // Reject control characters except tab (0x09)
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 && code !== 0x09) {
      throw new Error(
        `String value contains control character (0x${code.toString(16).padStart(2, "0")}) at position ${i}. Use Edit Config to update manually.`,
      );
    }
  }
  // Escape backslash, double-quote, and basic control chars
  const escaped = s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

/**
 * Serialize a single TOML value for the canonical grammar.
 * Only supports: strings (quoted), finite safe integers (bare),
 * arrays of strings, booleans.
 * @param {unknown} value
 * @returns {string}
 */
function serializeValue(value) {
  if (typeof value === "string") {
    return serializeString(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${String(value)}`);
    }
    if (!Number.isInteger(value)) {
      throw new Error(`Cannot serialize non-integer number: ${String(value)}`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Cannot serialize unsafe integer: ${String(value)}`);
    }
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((v) => {
        if (typeof v !== "string") {
          throw new Error(`Array contains non-string element: ${String(v)}`);
        }
        return serializeString(v);
      })
      .join(", ")}]`;
  }
  throw new Error(
    `Cannot serialize value of type ${typeof value}: ${String(value)}`,
  );
}

/**
 * Validate that an entry object matches the schema for its section type.
 * @param {string} sectionType
 * @param {Record<string, unknown>} entry
 * @throws {Error} if any key is not in the schema or values are invalid
 */
function validateEntryAgainstSchema(sectionType, entry) {
  const allowedKeys = SCHEMA_KEYS[sectionType];
  if (!allowedKeys) {
    throw new Error(`Unknown section type: ${sectionType}`);
  }
  const entryKeys = Object.keys(entry);
  for (const key of entryKeys) {
    if (!allowedKeys.includes(key)) {
      throw new Error(
        `Field "${key}" is not valid for [[${sectionType}]]. ` +
          "Use Edit Config to update manually.",
      );
    }
  }
}

/**
 * Serialize an entry object to TOML lines (without the [[section]] header).
 * Validates against schema and rejects invalid values.
 * @param {string} sectionType
 * @param {Record<string, unknown>} entry
 * @returns {string[]}
 */
export function serializeEntry(sectionType, entry) {
  validateEntryAgainstSchema(sectionType, entry);
  const lines = [];
  for (const key of SCHEMA_KEYS[sectionType]) {
    if (key in entry) {
      lines.push(`${key} = ${serializeValue(entry[key])}`);
    }
  }
  return lines;
}

// ── Line ending helpers ────────────────────────────────────────────────

/**
 * Detect the line ending style. Returns "\r\n" if any CRLF exists.
 * @param {string} content
 * @returns {string}
 */
function detectLineEnding(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Apply line ending to new lines.
 * @param {string[]} newLines
 * @param {string} eol
 * @returns {string[]}
 */
function applyLineEnding(newLines, eol) {
  if (eol === "\r\n") {
    return newLines.map((l) => (l.endsWith("\r") ? l : l + "\r"));
  }
  return newLines;
}

// ── Section header comments for new sections ───────────────────────────

const SECTION_HEADER_COMMENTS = {
  modifier_remap:
    "# Kernel-level modifier remaps (applied via hidutil on startup)",
  remap: "# Simple key swaps (unconditional)",
  tap_hold: "# Tap-hold: tap a modifier for one key, hold it for another",
  conditional_remap:
    "# Conditional remaps: when a modifier is held, remap keys",
  chord: "# Chords: keys pressed simultaneously within a time window",
};

// ── Semantic postcondition verification ────────────────────────────────

/**
 * Deep-equal comparison for TOML-parsed values.
 * Handles arrays, objects, strings, numbers, booleans.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]),
    );
  }
  return false;
}

/**
 * Verify that a candidate content string represents exactly the intended
 * semantic delta: one array entry added, updated, or deleted in the
 * target section, with all other content invariant.
 *
 * @param {string} originalContent - the original file content
 * @param {string} candidateContent - the candidate edited content
 * @param {string} sectionType - the section being edited
 * @param {"add" | "delete" | "update"} operation
 * @param {number | null} index - index for delete/update (null for add)
 * @param {Record<string, unknown> | null} entry - new entry for add/update
 * @throws {Error} if the candidate does not match the intended delta
 */
export function verifySemanticDelta(
  originalContent,
  candidateContent,
  sectionType,
  operation,
  index,
  entry,
) {
  // Both must parse
  const original = TOML.parse(originalContent);
  const candidate = TOML.parse(candidateContent);

  // Verify top-level keys: for "add", the target section may be a new
  // key. All original keys must be present; the candidate may have one
  // additional key (the target sectionType). For delete/update, keys
  // must be identical.
  const origKeys = Object.keys(original).sort();
  const candKeys = Object.keys(candidate).sort();
  if (operation === "add") {
    // All original keys must be present in candidate
    for (const k of origKeys) {
      if (!Object.prototype.hasOwnProperty.call(candidate, k)) {
        throw new Error(
          "Internal error: candidate removes top-level key. " +
            "Use Edit Config to update manually.",
        );
      }
    }
    // Candidate may have exactly one new key: the target sectionType
    if (candKeys.length === origKeys.length + 1) {
      const newKey = candKeys.find((k) => !origKeys.includes(k));
      if (newKey !== sectionType) {
        throw new Error(
          "Internal error: candidate adds unexpected top-level key. " +
            "Use Edit Config to update manually.",
        );
      }
    } else if (candKeys.length !== origKeys.length) {
      throw new Error(
        "Internal error: candidate changes top-level key count. " +
          "Use Edit Config to update manually.",
      );
    }
  } else if (operation === "delete") {
    // delete: the target section may be removed entirely (last entry
    // deleted) or may have one fewer entry. All OTHER keys must be
    // identical. The target key may disappear (last entry) or remain.
    for (const k of origKeys) {
      if (k === sectionType) continue;
      if (!Object.prototype.hasOwnProperty.call(candidate, k)) {
        throw new Error(
          `Internal error: candidate removes unrelated key "${k}". ` +
            "Use Edit Config to update manually.",
        );
      }
      if (!deepEqual(original[k], candidate[k])) {
        throw new Error(
          `Internal error: candidate modifies unrelated section "${k}". ` +
            "Use Edit Config to update manually.",
        );
      }
    }
    // The candidate may have one fewer key (if last entry deleted) or
    // the same keys (if more entries remain). It must NOT have any
    // new keys that weren't in the original.
    for (const k of candKeys) {
      if (!origKeys.includes(k)) {
        throw new Error(
          `Internal error: candidate adds unexpected key "${k}". ` +
            "Use Edit Config to update manually.",
        );
      }
    }
  } else {
    // update: keys must be identical
    if (
      origKeys.length !== candKeys.length ||
      !origKeys.every((k, i) => k === candKeys[i])
    ) {
      throw new Error(
        "Internal error: candidate changes top-level keys. " +
          "Use Edit Config to update manually.",
      );
    }
  }

  // Verify all sections except the target are invariant
  for (const key of origKeys) {
    if (key === sectionType) continue;
    if (!deepEqual(original[key], candidate[key])) {
      throw new Error(
        `Internal error: candidate modifies unrelated section "${key}". ` +
          "Use Edit Config to update manually.",
      );
    }
  }

  // Verify the target section has the intended delta
  const origArr = original[sectionType] ?? [];
  const candArr = candidate[sectionType] ?? [];

  if (operation === "add") {
    // Original + 1 entry at end = candidate
    if (candArr.length !== origArr.length + 1) {
      throw new Error(
        `Internal error: add produced ${candArr.length} entries, expected ${origArr.length + 1}.`,
      );
    }
    // All original entries must be present in same order
    for (let i = 0; i < origArr.length; i++) {
      if (!deepEqual(origArr[i], candArr[i])) {
        throw new Error(
          `Internal error: add changed entry ${i} in [[${sectionType}]].`,
        );
      }
    }
    // New entry must deep-equal the provided entry
    if (!deepEqual(candArr[candArr.length - 1], entry)) {
      throw new Error(
        `Internal error: added entry does not match intended value in [[${sectionType}]].`,
      );
    }
  } else if (operation === "delete") {
    // Original - 1 entry at index = candidate
    if (candArr.length !== origArr.length - 1) {
      throw new Error(
        `Internal error: delete produced ${candArr.length} entries, expected ${origArr.length - 1}.`,
      );
    }
    // Entries before index must match
    for (let i = 0; i < index; i++) {
      if (!deepEqual(origArr[i], candArr[i])) {
        throw new Error(
          `Internal error: delete changed entry ${i} in [[${sectionType}]].`,
        );
      }
    }
    // Entries after index must match (shifted by one)
    for (let i = index + 1; i < origArr.length; i++) {
      if (!deepEqual(origArr[i], candArr[i - 1])) {
        throw new Error(
          `Internal error: delete changed entry ${i} in [[${sectionType}]].`,
        );
      }
    }
  } else if (operation === "update") {
    // Same length, only entry at index changed
    if (candArr.length !== origArr.length) {
      throw new Error(
        `Internal error: update changed entry count in [[${sectionType}]].`,
      );
    }
    for (let i = 0; i < origArr.length; i++) {
      if (i === index) {
        if (!deepEqual(candArr[i], entry)) {
          throw new Error(
            `Internal error: updated entry ${i} does not match intended value in [[${sectionType}]].`,
          );
        }
      } else {
        if (!deepEqual(origArr[i], candArr[i])) {
          throw new Error(
            `Internal error: update changed entry ${i} in [[${sectionType}]].`,
          );
        }
      }
    }
  }
}

// ── Public mutation functions ──────────────────────────────────────────

/**
 * Check that content ends with a newline (either \n or \r\n).
 * Files without a trailing newline cause the canonical editor to produce
 * malformed candidates at the insertion seam. Refuse with a purposeful
 * message directing to manual editing rather than letting the parser
 * throw a confusing "incomplete key-value" error.
 *
 * @param {string} content
 * @throws {Error} if content is non-empty and doesn't end with a newline
 */
function assertTrailingNewline(content) {
  if (content.length > 0 && !content.endsWith("\n")) {
    throw new Error(
      "Config file does not end with a newline character. " +
        "This is a common editor configuration issue. " +
        "Use Edit Config to add a trailing newline, then try again.",
    );
  }
}

/**
 * Add an entry to the TOML file content at EOF (or after last block of
 * the same section type). Preserves all existing content.
 *
 * @param {string} content - full file content
 * @param {string} sectionType - one of KNOWN_SECTION_TYPES
 * @param {Record<string, unknown>} entry - entry to add
 * @returns {string} new file content
 * @throws {Error} if the file is non-canonical, missing trailing newline,
 *   or the candidate fails semantic verification
 */
export function addEntryToToml(content, sectionType, entry) {
  // Refuse if the file doesn't end with a newline — prevents malformed
  // insertion seam and confusing TOML parse errors.
  if (content.length > 0) {
    assertTrailingNewline(content);
  }

  // Scan to verify canonical and find existing blocks
  const { blocks } = scanCanonical(content);
  assertKnownKeysOnly(content);

  const sectionBlocks = findBlocks(blocks, sectionType);
  const lines = content.split("\n");
  const eol = detectLineEnding(content);

  // Serialize and validate the new entry
  const entryLines = serializeEntry(sectionType, entry);
  let newLines;

  if (sectionBlocks.length > 0) {
    // Insert after the last block of this section
    const lastBlock = sectionBlocks[sectionBlocks.length - 1];
    const insertIndex = lastBlock.endLine + 1;

    newLines = ["", `[[${sectionType}]]`, ...entryLines];

    // If the line after the last block is not blank, add a separator
    if (
      insertIndex < lines.length &&
      lines[insertIndex].replace(/\r$/, "").trim() !== ""
    ) {
      newLines.unshift("");
    }

    newLines = applyLineEnding(newLines, eol);
    lines.splice(insertIndex, 0, ...newLines);
  } else {
    // No existing section — append at end with header comment
    const comment = SECTION_HEADER_COMMENTS[sectionType];
    newLines = [];

    const contentTrimmed = content.trim();
    if (contentTrimmed !== "") {
      newLines.push("");
    }

    newLines.push(comment);
    newLines.push(`[[${sectionType}]]`);
    newLines.push(...entryLines);

    newLines = applyLineEnding(newLines, eol);
    lines.push(...newLines);
  }

  let candidate = lines.join("\n");

  // Ensure the output ends with a trailing newline if non-empty,
  // so the next mutation can proceed without a trailing-newline refusal.
  if (candidate.length > 0 && !candidate.endsWith("\n")) {
    if (candidate.endsWith("\r")) {
      // CRLF: last line has \r suffix from applyLineEnding, just needs \n
      candidate += "\n";
    } else {
      candidate += eol;
    }
  }

  // Semantic postcondition: candidate must be original + one entry
  verifySemanticDelta(content, candidate, sectionType, "add", null, entry);

  return candidate;
}

/**
 * Delete an entry from the TOML file content by section type and index.
 *
 * @param {string} content - full file content
 * @param {string} sectionType - one of KNOWN_SECTION_TYPES
 * @param {number} index - which block to delete (0-based)
 * @returns {string} new file content
 * @throws {Error} if index is out of range or non-canonical
 */
export function deleteEntryFromToml(content, sectionType, index) {
  const { blocks } = scanCanonical(content);
  assertKnownKeysOnly(content);

  const sectionBlocks = findBlocks(blocks, sectionType);

  if (index < 0 || index >= sectionBlocks.length) {
    throw new Error(`Entry not found: ${sectionType}:${index}`);
  }

  const block = sectionBlocks[index];
  const lines = content.split("\n");

  let removeCount = block.endLine - block.startLine + 1;

  // Also remove one trailing blank line if present (prevent double-blank)
  const afterBlock = block.endLine + 1;
  if (
    afterBlock < lines.length &&
    lines[afterBlock].replace(/\r$/, "").trim() === ""
  ) {
    removeCount++;
  }

  lines.splice(block.startLine, removeCount);
  let candidate = lines.join("\n");

  // Ensure the output ends with a trailing newline if non-empty,
  // so the next mutation can proceed without a trailing-newline refusal.
  if (candidate.length > 0 && !candidate.endsWith("\n")) {
    // For CRLF files, the last line may already have \r suffix
    // (from the original \r\n line ending). In that case, just add \n.
    if (candidate.endsWith("\r")) {
      candidate += "\n";
    } else {
      // Detect line ending from the original content
      const eol = detectLineEnding(content);
      candidate += eol;
    }
  }

  // Semantic postcondition
  verifySemanticDelta(content, candidate, sectionType, "delete", index, null);

  return candidate;
}

/**
 * Update an entry in the TOML file content by section type and index.
 *
 * Refuses BEFORE writing if:
 *   - The block contains comment lines (would be lost).
 *   - The block contains fields not present in newEntry (would be lost).
 *   - The new entry has fields not in the schema.
 *
 * @param {string} content - full file content
 * @param {string} sectionType - one of KNOWN_SECTION_TYPES
 * @param {number} index - which block to update (0-based)
 * @param {Record<string, unknown>} newEntry - replacement entry data
 * @returns {string} new file content
 * @throws {Error} on any refusal condition
 */
export function updateEntryInToml(content, sectionType, index, newEntry) {
  if (content.length > 0) {
    assertTrailingNewline(content);
  }
  const { blocks } = scanCanonical(content);
  assertKnownKeysOnly(content);

  const sectionBlocks = findBlocks(blocks, sectionType);

  if (index < 0 || index >= sectionBlocks.length) {
    throw new Error(`Entry not found: ${sectionType}:${index}`);
  }

  const block = sectionBlocks[index];
  const lines = content.split("\n");

  // Extract existing keys from the block. Since the scanner only accepts
  // bare [A-Za-z0-9_]+ keys, any valid key form is captured. Quoted,
  // dotted, or dashed keys would have caused scanCanonical to reject
  // before reaching here.
  const existingKeys = new Set(block.assignments.map((a) => a.key));
  const newEntryKeys = new Set(Object.keys(newEntry));

  // If existing block has keys not in the new entry, refuse
  const lostKeys = [];
  for (const key of existingKeys) {
    if (!newEntryKeys.has(key)) {
      lostKeys.push(key);
    }
  }
  if (lostKeys.length > 0) {
    throw new Error(
      `This entry contains fields that would be lost on update: ${lostKeys.join(", ")}. ` +
        "Use Edit Config to update manually, or include all existing fields in the update.",
    );
  }

  // Serialize and validate the new entry
  const entryLines = serializeEntry(sectionType, newEntry);
  const eol = detectLineEnding(content);
  const newBlockLines = applyLineEnding(
    [`[[${sectionType}]]`, ...entryLines],
    eol,
  );

  // Replace the block lines
  lines.splice(
    block.startLine,
    block.endLine - block.startLine + 1,
    ...newBlockLines,
  );

  const candidate = lines.join("\n");

  // Semantic postcondition
  verifySemanticDelta(
    content,
    candidate,
    sectionType,
    "update",
    index,
    newEntry,
  );

  return candidate;
}

// ── Unknown key detection (top-level) ──────────────────────────────────

/**
 * Check if a parsed TOML config has any unknown top-level keys.
 * @param {Record<string, unknown>} parsed
 * @returns {boolean}
 */
export function hasUnknownTopLevelKeys(parsed) {
  const knownSet = new Set(KNOWN_SECTION_TYPES);
  for (const key of Object.keys(parsed)) {
    if (!knownSet.has(key)) {
      return true;
    }
  }
  return false;
}

/**
 * Assert that a TOML config content has only known top-level keys.
 * @param {string} content - raw TOML file content
 * @throws {Error} if unknown top-level keys are present
 */
export function assertKnownKeysOnly(content) {
  const parsed = TOML.parse(content);
  if (hasUnknownTopLevelKeys(parsed)) {
    throw new Error(
      "Config contains unrecognized settings that would be lost. " +
        "Edit manually with the Edit Config command.",
    );
  }
}

// ── Snapshot / revision helpers ────────────────────────────────────────

/**
 * Compute a SHA-256 hash of content using Node.js crypto.
 * @param {string} content
 * @returns {string} hex digest
 */
export function computeRevision(content) {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Create a snapshot of the current config file state.
 * Returns content, revision hash, and parsed items for fingerprinting.
 *
 * @param {string} content - raw file content
 * @returns {{ content: string, revision: string, parsed: object }}
 */
export function createSnapshot(content) {
  const parsed = TOML.parse(content);
  return {
    content,
    revision: computeRevision(content),
    parsed,
  };
}

/**
 * Compute a semantic fingerprint for a single entry.
 * This is used to detect if the entry changed between UI load and
 * commit (stale revision detection).
 * @param {unknown} entry - a parsed TOML entry object
 * @returns {string} canonical JSON string of the entry
 */
export function entryFingerprint(entry) {
  // Sort keys for canonical representation
  const sorted = Object.keys(entry)
    .sort()
    .map((k) => [k, entry[k]]);
  return JSON.stringify(sorted);
}

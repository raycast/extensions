// ─────────────────────────────────────────────────────────────────────
// config-pure.mjs — pure validation helpers for config form input.
//
// Zero runtime dependencies. Safe to unit test with node:test.
// Imported by add-remap.tsx for inline form validation.
// ─────────────────────────────────────────────────────────────────────

/**
 * Parse a string as a positive integer.
 *
 * Accepts ONLY strings consisting of decimal digits (1-9 followed by
 * digits, or a single non-zero digit). Rejects:
 *   - Non-string types (arrays, objects, null, undefined, numbers)
 *   - Whitespace-only strings
 *   - Leading + or - signs
 *   - Exponent notation (1e3)
 *   - Hex notation (0x10)
 *   - Decimal notation (1.5, 1.0)
 *   - Zero, negative, NaN, Infinity
 *   - Unsafe integers (> Number.MAX_SAFE_INTEGER)
 *   - Values exceeding the daemon's u64 range (> 2^53 - 1, the max
 *     safe JS integer; the daemon's u64 max is 18446744073709551615
 *     but JS Number can't safely represent integers above 2^53-1)
 *
 * The daemon uses u64 for timeout_ms and window_ms, so the theoretical
 * max is 18446744073709551615. However, JS Number.MAX_SAFE_INTEGER
 * (9007199254740991) is the practical limit for integer-safe parsing.
 * We enforce this rather than inventing a more restrictive bound.
 *
 * @param {string} value - raw user input (must be a string)
 * @param {string} fieldName - human-readable field name for error message
 * @returns {number} the validated positive integer
 * @throws {Error} if the value is not a positive integer string
 */
export function parsePositiveInt(value, fieldName) {
  // Strict type check: only accept strings
  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} must be a positive integer (got ${typeof value}: ${String(value)})`,
    );
  }

  // Reject empty or whitespace-only strings
  if (value.trim() === "") {
    throw new Error(`${fieldName} must be a positive integer (got "${value}")`);
  }

  // Accept ONLY strings of decimal digits with no sign, no exponent,
  // no hex, no decimal point. The regex ensures:
  //   - Either "0" followed by nothing (but we reject 0 below), or
  //   - [1-9] followed by zero or more [0-9] digits
  // We reject "0" itself (not positive), "00", "01" (leading zeros),
  // "+5", "-5", "1e3", "0x10", "1.0", "1.5", " 5 ", etc.
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${fieldName} must be a positive integer (got "${value}")`);
  }

  const n = Number(value);

  // Redundant safety checks (regex already guarantees this, but belt
  // and suspenders for safe integer range)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${fieldName} must be a positive integer (got "${value}")`);
  }

  // Reject unsafe integers (beyond Number.MAX_SAFE_INTEGER)
  if (n > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      `${fieldName} must be a positive integer (got "${value}" — exceeds maximum safe integer)`,
    );
  }

  return n;
}

/**
 * Validate that a chord key selection is non-empty and has at least 2 keys.
 *
 * A single-key "chord" is not meaningful — it's just a remap.
 * Empty selection is a no-op that should never be written.
 * All elements must be non-empty strings (the TagPicker only produces
 * strings, but we validate defensively).
 *
 * @param {string[]} keys - selected key names
 * @returns {string[]} the validated key array
 * @throws {Error} if keys is empty, has fewer than 2 entries, or
 *   contains non-string or empty-string elements
 */
export function validateChordKeys(keys) {
  if (!Array.isArray(keys) || keys.length < 2) {
    throw new Error(
      "Chord requires at least 2 keys (got " +
        (Array.isArray(keys) ? keys.length : 0) +
        ")",
    );
  }
  for (let i = 0; i < keys.length; i++) {
    if (typeof keys[i] !== "string" || keys[i] === "") {
      throw new Error(
        `Chord keys must be non-empty strings (got ${typeof keys[i]} at index ${i}: ${String(keys[i])})`,
      );
    }
  }
  return keys;
}

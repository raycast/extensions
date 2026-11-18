export interface FileTypeInfo {
  char: string;
  name: string;
  bits: number;
}

export interface Triad {
  label: string;
  symbolic: string;
  digit: number;
}

export interface Conversion {
  source: "numeric" | "symbolic";
  /** Normalized input, e.g. "770" or "drwxr-xr-x" */
  from: string;
  /** Converted value, e.g. "rwxrwx---" or "755" */
  to: string;
  numeric: string;
  symbolic: string;
  fileType: FileTypeInfo | null;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
  triads: Triad[];
  /** Full st_mode octal (e.g. "040755") when a file type is known */
  fullOctal: string | null;
  chmodCommand: string | null;
  /** True for single digits or incomplete triads like "6" or "rw-" */
  partial: boolean;
}

const FILE_TYPES: Record<string, FileTypeInfo> = {
  "-": { char: "-", name: "Regular File", bits: 0o100000 },
  d: { char: "d", name: "Directory", bits: 0o040000 },
  l: { char: "l", name: "Symbolic Link", bits: 0o120000 },
  b: { char: "b", name: "Block Device", bits: 0o060000 },
  c: { char: "c", name: "Character Device", bits: 0o020000 },
  p: { char: "p", name: "Named Pipe (FIFO)", bits: 0o010000 },
  s: { char: "s", name: "Socket", bits: 0o140000 },
};

const TRIAD_LABELS = ["Owner", "Group", "Others"];

function digitToTriad(
  digit: number,
  position: number | null,
  setuid: boolean,
  setgid: boolean,
  sticky: boolean,
): string {
  const r = digit & 4 ? "r" : "-";
  const w = digit & 2 ? "w" : "-";
  const hasX = (digit & 1) !== 0;
  let x = hasX ? "x" : "-";
  if (position === 0 && setuid) x = hasX ? "s" : "S";
  if (position === 1 && setgid) x = hasX ? "s" : "S";
  if (position === 2 && sticky) x = hasX ? "t" : "T";
  return r + w + x;
}

function fullConversion(
  source: "numeric" | "symbolic",
  inputDisplay: string,
  permBits: number,
  fileType: FileTypeInfo | null,
): Conversion {
  const setuid = (permBits & 0o4000) !== 0;
  const setgid = (permBits & 0o2000) !== 0;
  const sticky = (permBits & 0o1000) !== 0;
  const digits = [(permBits >> 6) & 7, (permBits >> 3) & 7, permBits & 7];
  const triads = digits.map((digit, i) => ({
    label: TRIAD_LABELS[i],
    digit,
    symbolic: digitToTriad(digit, i, setuid, setgid, sticky),
  }));
  const symbolic = triads.map((t) => t.symbolic).join("");
  const specialDigit = (setuid ? 4 : 0) + (setgid ? 2 : 0) + (sticky ? 1 : 0);
  const numeric = (specialDigit ? String(specialDigit) : "") + digits.join("");
  const symbolicWithType = (fileType?.char ?? "") + symbolic;
  return {
    source,
    from: source === "numeric" ? inputDisplay : symbolicWithType,
    to: source === "numeric" ? symbolicWithType : numeric,
    numeric,
    symbolic,
    fileType,
    setuid,
    setgid,
    sticky,
    triads,
    fullOctal: fileType ? (fileType.bits | permBits).toString(8).padStart(6, "0") : null,
    chmodCommand: `chmod ${numeric}`,
    partial: false,
  };
}

function specialBitsFromDigit(digit: number): number {
  return ((digit & 4) !== 0 ? 0o4000 : 0) | ((digit & 2) !== 0 ? 0o2000 : 0) | ((digit & 1) !== 0 ? 0o1000 : 0);
}

function convertNumeric(input: string): Conversion | null {
  // 6 digits: full st_mode including the file type (e.g. 040755, 120777)
  if (input.length === 6) {
    const mode = parseInt(input, 8);
    const typeBits = mode & 0o170000;
    const fileType = Object.values(FILE_TYPES).find((t) => t.bits === typeBits) ?? null;
    if (!fileType) return null;
    return fullConversion("numeric", input, mode & 0o7777, fileType);
  }

  // 5 digits: chmod-style special digit + permission (e.g. 40755 = setuid + 0755)
  if (input.length === 5) {
    const specialDigit = parseInt(input[0], 8);
    const permBits = specialBitsFromDigit(specialDigit) | (parseInt(input.slice(1), 8) & 0o777);
    return fullConversion("numeric", input, permBits, null);
  }

  // 3-4 digits: permissions, optionally with a leading special-bits digit
  if (input.length >= 3) {
    return fullConversion("numeric", input, parseInt(input, 8), null);
  }

  // 1-2 digits: convert each digit to its triad on its own
  const triads = [...input].map((char, i) => {
    const digit = parseInt(char, 8);
    return {
      label: input.length === 1 ? "Permissions" : `Digit ${i + 1}`,
      digit,
      symbolic: digitToTriad(digit, null, false, false, false),
    };
  });
  const symbolic = triads.map((t) => t.symbolic).join("");
  return {
    source: "numeric",
    from: input,
    to: symbolic,
    numeric: input,
    symbolic,
    fileType: null,
    setuid: false,
    setgid: false,
    sticky: false,
    triads,
    fullOctal: null,
    chmodCommand: null,
    partial: true,
  };
}

/** Parse one triad at a fixed position, honoring s/S (setuid/setgid) and t/T (sticky). */
function positionalTriad(chunk: string, position: number): { digit: number; special: boolean } | null {
  let digit = 0;
  let special = false;
  if (chunk[0] === "r") digit += 4;
  else if (chunk[0] !== "-") return null;
  if (chunk[1] === "w") digit += 2;
  else if (chunk[1] !== "-") return null;
  const x = chunk[2];
  if (x === "x") digit += 1;
  else if ((x === "s" || x === "S") && position < 2) {
    special = true;
    if (x === "s") digit += 1;
  } else if ((x === "t" || x === "T") && position === 2) {
    special = true;
    if (x === "t") digit += 1;
  } else if (x !== "-") return null;
  return { digit, special };
}

/** Sum r/w/x letters of a partial triad like "r", "rw" or "r-x". */
function lenientTriad(chunk: string): number | null {
  let bits = 0;
  for (const char of chunk) {
    const bit = char === "r" ? 4 : char === "w" ? 2 : char === "x" ? 1 : char === "-" ? 0 : null;
    if (bit === null) return null;
    if (bit !== 0 && (bits & bit) !== 0) return null;
    bits |= bit;
  }
  return bits;
}

function partialSymbolicConversion(chunks: string[], singleLabel: string): Conversion | null {
  const digits: number[] = [];
  for (const chunk of chunks) {
    const digit = lenientTriad(chunk);
    if (digit === null) return null;
    digits.push(digit);
  }
  const triads = digits.map((digit, i) => ({
    label: chunks.length === 1 ? singleLabel : TRIAD_LABELS[i + (3 - chunks.length)],
    digit,
    symbolic: digitToTriad(digit, null, false, false, false),
  }));
  const symbolic = triads.map((t) => t.symbolic).join("");
  const numeric = digits.join("");
  return {
    source: "symbolic",
    from: chunks.join(""),
    to: numeric,
    numeric,
    symbolic,
    fileType: null,
    setuid: false,
    setgid: false,
    sticky: false,
    triads,
    fullOctal: null,
    chmodCommand: null,
    partial: true,
  };
}

function convertSymbolic(raw: string): Conversion | null {
  const s = raw.replace(/\s+/g, "");
  if (!/^[rwxsStTdlbcp-]+$/.test(s)) return null;

  let fileType: FileTypeInfo | null = null;
  let perms = s;
  // 10 characters: `ls -l` style with a leading file type, e.g. drwxr-xr-x
  if (s.length === 10) {
    fileType = FILE_TYPES[s[0]] ?? null;
    if (!fileType) return null;
    perms = s.slice(1);
  }

  if (perms.length === 9) {
    let permBits = 0;
    for (let i = 0; i < 3; i++) {
      const parsed = positionalTriad(perms.slice(i * 3, i * 3 + 3), i);
      if (!parsed) return null;
      permBits |= parsed.digit << ((2 - i) * 3);
      if (parsed.special) permBits |= 0o4000 >> i;
    }
    return fullConversion("symbolic", s, permBits, fileType);
  }

  if (!fileType && perms.length <= 3) return partialSymbolicConversion([perms], "Permissions");
  if (!fileType && perms.length === 6)
    return partialSymbolicConversion([perms.slice(0, 3), perms.slice(3)], "Permissions");
  return null;
}

/**
 * Convert between numeric and symbolic chmod notation.
 * Accepts an optional leading "chmod " and returns null for invalid input.
 */
export function convert(raw: string): Conversion | null {
  const input = raw
    .trim()
    .replace(/^chmod\s+/i, "")
    .trim();
  if (!input) return null;
  if (/^[0-7]{1,6}$/.test(input)) return convertNumeric(input);
  if (/^\d+$/.test(input)) return null;
  return convertSymbolic(input);
}

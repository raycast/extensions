import keymapData from "./keymap.json";

export type LayoutDirection = "fa2us" | "us2fa";

const PASSTHROUGH = new Set([" ", "\t", "\n", "\r"]);
const ASCII_DIGITS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

function isAscii(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 128) {
      return false;
    }
  }
  return true;
}

export function loadKeymaps(data = keymapData): {
  us2fa: Record<string, string>;
  fa2us: Record<string, string>;
} {
  const us2fa: Record<string, string> = {};
  const faScored: Record<string, { score: [number, number, number]; u: string }> = {};

  for (const p of data.pairs) {
    const u = p.us;
    const faChar = p.fa;

    // Build us2fa: ASCII digits are NOT converted US -> Persian
    if (!PASSTHROUGH.has(u) && !ASCII_DIGITS.has(u)) {
      if (!(u in us2fa) || !p.shift) {
        us2fa[u] = faChar;
      }
    }

    // Build fa2us: on collisions, keep unshifted keycode
    if (!PASSTHROUGH.has(faChar)) {
      const score: [number, number, number] = [!p.shift ? 1 : 0, isAscii(u) ? 1 : 0, u !== " " ? 1 : 0];
      const existing = faScored[faChar];
      if (
        !existing ||
        score[0] > existing.score[0] ||
        (score[0] === existing.score[0] && score[1] > existing.score[1]) ||
        (score[0] === existing.score[0] && score[1] === existing.score[1] && score[2] > existing.score[2])
      ) {
        faScored[faChar] = { score, u };
      }
    }
  }

  const fa2us: Record<string, string> = {};
  for (const [k, v] of Object.entries(faScored)) {
    fa2us[k] = v.u;
  }

  // Persian digits ۰–۹ and Arabic-Indic ٠–٩ convert to ASCII on fa -> us
  for (let i = 0; i < 10; i++) {
    fa2us[String.fromCharCode(0x06f0 + i)] = String(i);
    fa2us[String.fromCharCode(0x0660 + i)] = String(i);
  }

  // Arabic-script variants map to their Persian layout key if not already in the map
  if (!("ي" in fa2us)) {
    fa2us["ي"] = fa2us["ی"] ?? "d";
  }
  if (!("ك" in fa2us)) {
    fa2us["ك"] = fa2us["ک"] ?? ";";
  }

  return { us2fa, fa2us };
}

const { us2fa: US2FA, fa2us: FA2US } = loadKeymaps();

export function convertUs2Fa(text: string): string {
  let result = "";
  for (const c of text) {
    if (PASSTHROUGH.has(c) || ASCII_DIGITS.has(c)) {
      result += c;
    } else {
      result += US2FA[c] ?? c;
    }
  }
  return result;
}

export function convertFa2Us(text: string): string {
  let result = "";
  for (const c of text) {
    if (PASSTHROUGH.has(c)) {
      result += c;
    } else {
      result += FA2US[c] ?? c;
    }
  }
  return result;
}

export function isArabicScript(c: string): boolean {
  const cp = c.codePointAt(0) ?? 0;
  return (cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);
}

export function isAsciiLetter(c: string): boolean {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

export function detectDirection(text: string): LayoutDirection {
  let arabicCount = 0;
  let asciiCount = 0;
  for (const c of text) {
    if (isArabicScript(c)) {
      arabicCount++;
    }
    if (isAsciiLetter(c)) {
      asciiCount++;
    }
  }
  if (arabicCount > asciiCount) {
    return "fa2us";
  }
  return "us2fa";
}

export function convertLayout(text: string, direction: LayoutDirection): string {
  return direction === "fa2us" ? convertFa2Us(text) : convertUs2Fa(text);
}

export function fixLayout(text: string): string {
  return convertLayout(text, detectDirection(text));
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generatePassword,
  generatePassphrase,
  generatePin,
  charsetSize,
  estimatePasswordEntropy,
  estimatePassphraseEntropy,
  estimatePinEntropy,
  pick,
  shuffle,
  UPPERCASE,
  LOWERCASE,
  DIGITS,
  SYMBOLS,
  AMBIGUOUS,
} from "./password";
import { WORDS } from "./words";

const LETTERS = UPPERCASE + LOWERCASE;
const ALL_CHARS = LETTERS + DIGITS + SYMBOLS;

describe("pick", () => {
  it("returns an element from the array", () => {
    const arr = ["a", "b", "c"];
    const result = pick(arr);
    assert(arr.includes(result));
  });

  it("returns different elements over multiple calls", () => {
    const arr = [1, 2, 3, 4, 5];
    const results = new Set(Array.from({ length: 50 }, () => pick(arr)));
    assert(results.size > 1);
  });

  it("works with single-element array", () => {
    assert.equal(pick(["x"]), "x");
  });
});

describe("shuffle", () => {
  it("returns array of same length", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const result = shuffle([...arr]);
    assert.equal(result.length, arr.length);
  });

  it("contains the same elements", () => {
    const arr = ["a", "b", "c", "d", "e"];
    const result = shuffle([...arr]);
    assert.deepEqual([...result].sort(), [...arr].sort());
  });

  it("is not always in the same order (probabilistic)", () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    let sameOrder = 0;
    for (let i = 0; i < 100; i++) {
      const result = shuffle([...arr]);
      if (result.every((v, j) => v === arr[j])) sameOrder++;
    }
    assert(sameOrder < 10, "shuffled same order too many times");
  });
});

describe("charsetSize", () => {
  it("counts all selected character types", () => {
    assert.equal(
      charsetSize({
        length: 10,
        useUppercase: true,
        useLowercase: true,
        useDigits: true,
        useSymbols: true,
        useAmbiguous: true,
      }),
      26 + 26 + 10 + SYMBOLS.length,
    );
  });

  it("excludes ambiguous chars when flagged", () => {
    const withAmbiguous = charsetSize({
      length: 10,
      useUppercase: true,
      useLowercase: true,
      useDigits: true,
      useSymbols: true,
      useAmbiguous: true,
    });
    const withoutAmbiguous = charsetSize({
      length: 10,
      useUppercase: true,
      useLowercase: true,
      useDigits: true,
      useSymbols: true,
      useAmbiguous: false,
    });
    assert.equal(withAmbiguous - withoutAmbiguous, 5);
  });

  it("returns at least 1", () => {
    assert.equal(
      charsetSize({
        length: 10,
        useUppercase: false,
        useLowercase: false,
        useDigits: false,
        useSymbols: false,
        useAmbiguous: false,
      }),
      1,
    );
  });
});

describe("generatePassword", () => {
  it("returns a string of the requested length", () => {
    const pw = generatePassword({
      length: 20,
      useUppercase: true,
      useLowercase: true,
      useDigits: true,
      useSymbols: true,
      useAmbiguous: false,
    });
    assert.equal(pw.length, 20);
  });

  it("contains only allowed characters", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({
        length: 30,
        useUppercase: true,
        useLowercase: true,
        useDigits: true,
        useSymbols: true,
        useAmbiguous: false,
      });
      for (const ch of pw) {
        assert(ALL_CHARS.includes(ch) && !AMBIGUOUS.includes(ch));
      }
    }
  });

  it("contains at least one character from each selected set", () => {
    const options = {
      length: 10,
      useUppercase: true,
      useLowercase: true,
      useDigits: true,
      useSymbols: true,
      useAmbiguous: false,
    };
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(options);
      assert(
        [...pw].some((c) => UPPERCASE.includes(c) && !AMBIGUOUS.includes(c)),
        `missing uppercase in ${pw}`,
      );
      assert(
        [...pw].some((c) => LOWERCASE.includes(c) && !AMBIGUOUS.includes(c)),
        `missing lowercase in ${pw}`,
      );
      assert(
        [...pw].some((c) => DIGITS.includes(c) && !AMBIGUOUS.includes(c)),
        `missing digit in ${pw}`,
      );
      assert(
        [...pw].some((c) => SYMBOLS.includes(c) && !AMBIGUOUS.includes(c)),
        `missing symbol in ${pw}`,
      );
    }
  });

  it("excludes ambiguous characters when useAmbiguous is false", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({
        length: 30,
        useUppercase: true,
        useLowercase: true,
        useDigits: true,
        useSymbols: false,
        useAmbiguous: false,
      });
      for (const ch of pw) {
        assert(!AMBIGUOUS.includes(ch));
      }
    }
  });

  it("includes ambiguous characters when useAmbiguous is true", () => {
    let foundAmbiguous = false;
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword({
        length: 50,
        useUppercase: true,
        useLowercase: true,
        useDigits: true,
        useSymbols: true,
        useAmbiguous: true,
      });
      if ([...pw].some((c) => AMBIGUOUS.includes(c))) {
        foundAmbiguous = true;
        break;
      }
    }
    assert(
      foundAmbiguous,
      "expected at least one ambiguous character in 100 tries",
    );
  });

  it("falls back to lowercase + digits when no charset selected", () => {
    const pw = generatePassword({
      length: 10,
      useUppercase: false,
      useLowercase: false,
      useDigits: false,
      useSymbols: false,
      useAmbiguous: false,
    });
    assert.equal(pw.length, 10);
    for (const ch of pw) {
      assert((LOWERCASE + DIGITS).includes(ch));
    }
  });

  it("produces different passwords each call", () => {
    const passwords = new Set(
      Array.from({ length: 20 }, () =>
        generatePassword({
          length: 20,
          useUppercase: true,
          useLowercase: true,
          useDigits: true,
          useSymbols: true,
          useAmbiguous: false,
        }),
      ),
    );
    assert.equal(passwords.size, 20, "passwords should all be unique");
  });
});

describe("generatePassphrase", () => {
  it("returns the requested number of words", () => {
    const pp = generatePassphrase({
      wordCount: 6,
      separator: "-",
      capitalize: false,
      includeNumber: false,
    });
    assert.equal(pp.split("-").length, 6);
  });

  it("uses the specified separator", () => {
    const pp = generatePassphrase({
      wordCount: 4,
      separator: "~",
      capitalize: false,
      includeNumber: false,
    });
    assert.equal(pp.split("~").length, 4);
  });

  it("capitalizes each word when requested", () => {
    const pp = generatePassphrase({
      wordCount: 6,
      separator: "-",
      capitalize: true,
      includeNumber: false,
    });
    for (const word of pp.split("-")) {
      assert.equal(word[0], word[0].toUpperCase());
    }
  });

  it("appends a number when requested", () => {
    const pp = generatePassphrase({
      wordCount: 4,
      separator: "-",
      capitalize: false,
      includeNumber: true,
    });
    const parts = pp.split("-");
    assert(parts.length >= 5);
    const last = parts[parts.length - 1];
    assert(
      /^\d{1,2}$/.test(last),
      `expected a number at the end, got "${last}"`,
    );
  });

  it("contains only words from the wordlist", () => {
    const wordSet = new Set(WORDS);
    const pp = generatePassphrase({
      wordCount: 6,
      separator: " ",
      capitalize: false,
      includeNumber: false,
    });
    for (const word of pp.split(" ")) {
      assert(wordSet.has(word), `"${word}" is not in the wordlist`);
    }
  });

  it("produces different passphrases each call", () => {
    const phrases = new Set(
      Array.from({ length: 20 }, () =>
        generatePassphrase({
          wordCount: 5,
          separator: "-",
          capitalize: false,
          includeNumber: false,
        }),
      ),
    );
    assert.equal(phrases.size, 20, "passphrases should all be unique");
  });
});

describe("generatePin", () => {
  it("returns a string of the requested length", () => {
    const pin = generatePin({ length: 6 });
    assert.equal(pin.length, 6);
  });

  it("contains only digits", () => {
    for (let i = 0; i < 20; i++) {
      const pin = generatePin({ length: 8 });
      assert(/^\d+$/.test(pin), `expected only digits, got "${pin}"`);
    }
  });

  it("produces different PINs each call", () => {
    const pins = new Set(
      Array.from({ length: 20 }, () => generatePin({ length: 6 })),
    );
    assert.equal(pins.size, 20, "PINs should all be unique");
  });
});

describe("estimatePasswordEntropy", () => {
  it("returns expected bits for common config", () => {
    const bits = estimatePasswordEntropy({
      length: 20,
      useUppercase: true,
      useLowercase: true,
      useDigits: true,
      useSymbols: true,
      useAmbiguous: true,
    });
    assert.equal(bits, Math.round(20 * Math.log2(70) * 10) / 10);
  });

  it("returns 0 for length 0", () => {
    const bits = estimatePasswordEntropy({
      length: 0,
      useUppercase: true,
      useLowercase: true,
      useDigits: true,
      useSymbols: true,
      useAmbiguous: true,
    });
    assert.equal(bits, 0);
  });
});

describe("estimatePassphraseEntropy", () => {
  it("returns expected bits without number", () => {
    const bits = estimatePassphraseEntropy({
      wordCount: 6,
      separator: "-",
      capitalize: false,
      includeNumber: false,
    });
    assert.equal(bits, Math.round(6 * Math.log2(7776) * 10) / 10);
  });

  it("includes extra entropy for appended number", () => {
    const without = estimatePassphraseEntropy({
      wordCount: 6,
      separator: "-",
      capitalize: false,
      includeNumber: false,
    });
    const withNum = estimatePassphraseEntropy({
      wordCount: 6,
      separator: "-",
      capitalize: false,
      includeNumber: true,
    });
    assert(withNum > without);
  });
});

describe("estimatePinEntropy", () => {
  it("returns expected bits", () => {
    const bits = estimatePinEntropy({ length: 6 });
    assert.equal(bits, Math.round(6 * Math.log2(10) * 10) / 10);
  });
});

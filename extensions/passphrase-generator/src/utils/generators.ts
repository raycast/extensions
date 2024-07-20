import { randomInt } from "crypto";
import { readFileSync } from "fs";

import { ASCII_CHARACTERS, NUMBERS } from "./constants";
import usePreferences, { Preferences } from "../hooks/usePreferences";
import product from "./product";

export class PasswordGenerator {
  id?: string;
  title?: string;
  password: string;
  strength = 0;
  preferences: Preferences;

  constructor({ strength, length }: { strength?: number; length?: number }) {
    this.preferences = usePreferences();

    const [password, passwordStrength] = this.generate({ strength, length });
    this.password = password;
    this.strength = passwordStrength;
  }

  generate({ strength, length }: { strength?: number; length?: number }): [string, number] {
    const pw = [];
    if (strength) {
      length = Math.ceil(strength / this.entropy);
    }

    // Just to make typescript happy
    length = length as number;

    for (let i = 0; i < length; i++) {
      pw.push(this.data[randomInt(this.data.length)]);
    }

    return [pw.join(""), Math.floor(this.entropy * pw.length)];
  }

  get entropy(): number {
    return Math.log2(this.data.length);
  }

  get data(): string | string[] {
    return "";
  }
}

export class AsciiGenerator extends PasswordGenerator {
  id = "ascii";
  title = "ASCII characters with punctuation";

  get data(): string {
    return ASCII_CHARACTERS + NUMBERS + this.preferences.specialCharacters;
  }
}

export class AlphanumGenerator extends PasswordGenerator {
  id = "alphanumeric";
  title = "ASCII characters, no punctuation";

  get data(): string {
    return ASCII_CHARACTERS + NUMBERS;
  }
}

export class HexGenerator extends PasswordGenerator {
  id = "hex";
  title = "Hexadecimal characters";

  get data(): string {
    return "0123456789abcdef";
  }
}

export class NumericGenerator extends PasswordGenerator {
  id = "numeric";
  title = "Digits only";

  get data(): string {
    return NUMBERS;
  }
}

export class DictionaryGenerator extends PasswordGenerator {
  id = "dictionary";
  title = "Dictionary words";
  words: string[] = [];

  private password_by_iterations(iterations: number): [string, number] {
    const pw = [];
    for (let index = 0; index < iterations; index++) {
      const word = this.data[randomInt(this.data.length)];
      pw.push(word[0].toUpperCase() + word.substring(1) + Math.floor(Math.random() * 9 + 1));
    }

    return [pw.join(this.preferences.delimiter), Math.floor(this.entropy * iterations)];
  }

  private password_by_length(length: number): [string, number] {
    const pw = [];
    let pw_length = 0;

    while (pw_length < length) {
      const word = this.data[randomInt(this.data.length)];
      pw.push(word[0].toUpperCase() + word.substring(1) + Math.floor(Math.random() * 9 + 1));
      pw_length += word.length + 2;
    }

    return [pw.join(this.preferences.delimiter), Math.floor(this.entropy * pw.length)];
  }

  generate({ strength, length }: { strength?: number; length?: number }): [string, number] {
    if (strength) {
      return this.password_by_iterations(Math.ceil(strength / this.entropy));
    } else {
      return this.password_by_length(length as number);
    }
  }

  get data(): string[] {
    if (this.words) return this.words;
    try {
      this.words = readFileSync("/usr/share/dict/words", "utf8").split(/\r?\n/);

      return this.words;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

export class PronounceableGenerator extends DictionaryGenerator {
  id = "pronounceable";
  title = "Pronounceable, (mostly) nonsense words";

  get data(): string[] {
    const initial_consonants = [
      "b",
      "bl",
      "br",
      "cl",
      "cr",
      "d",
      "dr",
      "f",
      "fl",
      "fr",
      "g",
      "gl",
      "gr",
      "h",
      "j",
      "k",
      "l",
      "m",
      "n",
      "p",
      "pl",
      "pr",
      "r",
      "s",
      "sk",
      "sl",
      "sm",
      "sn",
      "sp",
      "st",
      "str",
      "sw",
      "t",
      "tr",
      "v",
      "w",
      "y",
      "z",
    ];
    const final_consonants = [
      "b",
      "ct",
      "d",
      "f",
      "ft",
      "g",
      "h",
      "k",
      "l",
      "m",
      "mp",
      "n",
      "nd",
      "ng",
      "nk",
      "nt",
      "p",
      "pt",
      "r",
      "sk",
      "sp",
      "ss",
      "st",
      "t",
      "v",
      "w",
      "y",
      "z",
    ];
    const vowels = ["a", "e", "i", "o", "u"];
    this.words = [];

    for (const iter of product(initial_consonants, vowels, final_consonants)) {
      this.words.push(iter.join(""));
    }

    return this.words;
  }
}

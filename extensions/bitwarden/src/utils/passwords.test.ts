import { getPasswordGeneratingArgs } from "~/utils/passwords";
import type { PasswordGeneratorOptions } from "~/types/passwords";

describe("getPasswordGeneratingArgs", () => {
  it("includes only boolean flags that are true", () => {
    const options: PasswordGeneratorOptions = {
      lowercase: true,
      uppercase: false,
      number: true,
      special: false,
      passphrase: false,
    };

    expect(getPasswordGeneratingArgs(options)).toEqual(["--lowercase", "--number"]);
  });

  it("adds string-based arguments in insertion order", () => {
    const options: PasswordGeneratorOptions = {
      length: "18",
      minNumber: "2",
      minSpecial: "1",
      lowercase: true,
      uppercase: true,
    };

    expect(getPasswordGeneratingArgs(options)).toEqual([
      "--length",
      "18",
      "--minNumber",
      "2",
      "--minSpecial",
      "1",
      "--lowercase",
      "--uppercase",
    ]);
  });

  it("merges boolean and string options consistently", () => {
    const options: PasswordGeneratorOptions = {
      lowercase: true,
      uppercase: true,
      number: false,
      special: true,
      passphrase: false,
      length: "12",
    };

    expect(getPasswordGeneratingArgs(options)).toEqual(["--lowercase", "--uppercase", "--special", "--length", "12"]);
  });

  it("filters out PassphraseOptions when passphrase is false", () => {
    const options: PasswordGeneratorOptions = {
      passphrase: false,
      lowercase: true,
      length: "12",
      // Passphrase-only options — should be omitted from output
      words: "5",
      separator: "-",
      capitalize: true,
      includeNumber: true,
    };

    expect(getPasswordGeneratingArgs(options)).toEqual(["--lowercase", "--length", "12"]);
  });

  it("filters out PasswordOptions when passphrase is true", () => {
    const options: PasswordGeneratorOptions = {
      passphrase: true,
      words: "6",
      capitalize: true,
      // Password-only options — should be omitted from output
      lowercase: true,
      uppercase: true,
      number: true,
      special: true,
      length: "20",
      minNumber: "2",
      minSpecial: "1",
    };

    expect(getPasswordGeneratingArgs(options)).toEqual(["--passphrase", "--words", "6", "--capitalize"]);
  });
});

import { getPasswordGeneratingArgs } from "~/utils/passwords";
import type { PasswordGeneratorOptions } from "~/types/passwords";

describe("getPasswordGeneratingArgs", () => {
  it("includes only boolean flags that are true", () => {
    const options: PasswordGeneratorOptions = {
      lowercase: true,
      uppercase: false,
      number: true,
      special: false,
      passphrase: true,
    };

    expect(getPasswordGeneratingArgs(options)).toEqual(["--lowercase", "--number", "--passphrase"]);
  });

  it("adds string-based arguments in insertion order", () => {
    const options: PasswordGeneratorOptions = {
      length: "18",
      minNumber: "2",
      minSpecial: "1",
      words: "4",
      separator: "_",
      capitalize: true,
      includeNumber: true,
    };

    expect(getPasswordGeneratingArgs(options)).toEqual([
      "--length",
      "18",
      "--minNumber",
      "2",
      "--minSpecial",
      "1",
      "--words",
      "4",
      "--separator",
      "_",
      "--capitalize",
      "--includeNumber",
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
});

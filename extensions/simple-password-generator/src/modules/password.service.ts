export type GeneratePasswordOptions = {
  passwordLength: number;
  useNumbers: boolean;
  useSymbols: boolean;
  useLowerCase: boolean;
  useUpperCase: boolean;
  allowAmbiguousCharacters: boolean;
  blockList: string;
};

const symbols = "!@#$%^&*()_+-=[]{}\\|;:'\",./<>?";
const numbers = "0123456789";
const lowerCaseLetters = "abcdefghijklmnopqrstuvwxyz";
const upperCaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const similarCharacters = "i1lI0O";
const replacementRegex = new RegExp(`[${similarCharacters}]`, "g");

const PasswordService = {
  generatePassword: (options: GeneratePasswordOptions) => {
    const { passwordLength: length } = options;
    const alphabet = PasswordService.formAlphabet(options);
    const password = Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

    return password;
  },
  countEntropyBits: (options: GeneratePasswordOptions) => {
    let alphabet = PasswordService.formAlphabet(options);
    if (!alphabet.length) return 0;
    const entropyBits = Math.log2(alphabet.length) * options.passwordLength;
    return entropyBits;
  },

  formAlphabet: (options: GeneratePasswordOptions) => {
    const { useNumbers, useSymbols, useLowerCase, useUpperCase, allowAmbiguousCharacters, blockList } = options;
    let alphabet = "";
    if (useNumbers) {
      alphabet += numbers;
    }
    if (useSymbols) {
      alphabet += symbols;
    }
    if (useLowerCase) {
      alphabet += lowerCaseLetters;
    }
    if (useUpperCase) {
      alphabet += upperCaseLetters;
    }
    if (!allowAmbiguousCharacters) {
      alphabet = alphabet.replaceAll(replacementRegex, "");
    }
    if (blockList && blockList.length) {
      alphabet = alphabet.replaceAll(new RegExp(`[${blockList}]`, "gi"), "");
    }
    return alphabet;
  },
};

export default PasswordService;

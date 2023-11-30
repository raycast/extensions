import { PasswordOptions, PasswordItem } from "./interface";
import { randomInt } from "node:crypto";

let characters = "";
let passwordLength = 0;

const setUpperCase = (isUpperCase: boolean) => {
  if (isUpperCase) {
    characters += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  return "";
};

const setLowerCase = (isLowerCase: boolean) => {
  if (isLowerCase) {
    characters += "abcdefghijklmnopqrstuvwxyz";
  }
  return "";
};

const setSymbols = (isSymbol: boolean) => {
  if (isSymbol) {
    characters += "~`!@#$%^&*()_-+={[}]|\\:;\"'<,>.?/";
  }
  return "";
};

const setNumber = (isNumeric: boolean) => {
  if (isNumeric) {
    characters += "0123456789";
  }
  return "";
};

const passwordCharacters = (): string => {
  const characterList = characters;
  let password = "";
  if (characterList.length > 0) {
    for (let i = 0; i < passwordLength; i++) {
      password += characterList[randomInt(characterList.length)];
    }
    characters = "";
    passwordLength = 0;
  }
  return password;
};

const setPasswordLength = (length: number) => {
  passwordLength = length;
  return passwordLength;
};

const setOptions = ({ isUpperCase, isLowerCase, isSymbol, isNumeric }: PasswordOptions) => {
  if (isUpperCase !== undefined) setUpperCase(isUpperCase);
  if (isLowerCase !== undefined) setLowerCase(isLowerCase);
  if (isSymbol !== undefined) setSymbols(isSymbol);
  if (isNumeric !== undefined) setNumber(isNumeric);
};

export const getIcon = (strength?: number): string => {
  switch (strength) {
    case 0:
      return "🟣";
    case 1:
      return "🔴";
    case 2:
      return "🟠";
    case 3:
      return "🟡";
    case 4:
      return "🟢";
    default:
      return "⚪️";
  }
};

// generates password with - in-between the characters
const generateSegmentedPassword = (pwdLength = 12, options: PasswordOptions): string => {
  const segments = Math.floor(pwdLength / 4);

  return Array(segments)
    .fill(0)
    .map((_, index) => {
      setOptions(options);
      const length = index === 0 ? 4 : 3;
      setPasswordLength(length);
      return passwordCharacters();
    })
    .join("-");
};

const generatePassword = (pwdLength = 12, passwordProps?: PasswordOptions): PasswordItem => {
  const defaultPasswordOptions: PasswordOptions = {
    name: "Alphabets, Numbers and Symbols",
    isUpperCase: true,
    isLowerCase: true,
    isSymbol: true,
    isNumeric: true,
  };

  setPasswordLength(pwdLength);

  const options = passwordProps ?? defaultPasswordOptions;

  setOptions(options);

  const password: string = options.isSegmented ? generateSegmentedPassword(pwdLength, options) : passwordCharacters();

  return {
    password,
    options,
  };
};

export const generatePasswords = (passwordLength: number): PasswordItem[] => {
  const options: PasswordOptions[] = [
    {
      name: "Alphabets, Numbers and Symbols",
      isUpperCase: true,
      isLowerCase: true,
      isNumeric: true,
      isSymbol: true,
    },
    {
      name: "Alphabets & Numbers",
      isUpperCase: true,
      isLowerCase: true,
      isSymbol: false,
      isNumeric: true,
      isSegmented: true,
    },
    {
      name: "Alphabets & Numbers",
      isLowerCase: true,
      isUpperCase: true,
      isNumeric: true,
      isSymbol: false,
    },
    {
      name: "Alphabets & Symbols",
      isLowerCase: true,
      isUpperCase: false,
      isNumeric: false,
      isSymbol: true,
    },
    // {
    //   name: "Numbers & Symbols",
    //   isLowerCase: false,
    //   isUpperCase: false,
    //   isNumeric: true,
    //   isSymbol: true,
    // },
    {
      name: "Symbols",
      isLowerCase: false,
      isUpperCase: false,
      isNumeric: false,
      isSymbol: true,
    },
    {
      name: "Alphabets",
      isLowerCase: true,
      isUpperCase: false,
      isNumeric: false,
      isSymbol: false,
    },
    {
      name: "Alphabets",
      isLowerCase: true,
      isUpperCase: true,
      isNumeric: false,
      isSymbol: false,
    },
    {
      name: "Alphabets",
      isLowerCase: true,
      isUpperCase: true,
      isNumeric: false,
      isSymbol: false,
      isSegmented: true,
    },
    {
      name: "Numbers",
      isLowerCase: false,
      isUpperCase: false,
      isNumeric: true,
      isSymbol: false,
    },
    {
      name: "Numbers",
      isUpperCase: false,
      isLowerCase: false,
      isSymbol: false,
      isNumeric: true,
      isSegmented: true,
    },
  ];

  return options.map((option) => generatePassword(passwordLength, option));
};

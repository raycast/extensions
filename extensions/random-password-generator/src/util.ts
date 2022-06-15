import { getPasswordDetails } from "./passwordDetails";
import { Utils } from "./interface";

let characters = "";
let passwordLength = 0;

interface PasswordProps {
  isUpperCase: boolean;
  isLowerCase: boolean;
  isSymbol: boolean;
  isNumeric: boolean;
}

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

const getRandomInteger = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const passwordCharacters = (): string => {
  const characterList = characters;
  let password = "";
  if (characterList.length > 0) {
    for (let i = 0; i < passwordLength; i++) {
      password += characterList[getRandomInteger(0, characterList.length - 1)];
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

const setOptions = ({ isUpperCase, isLowerCase, isSymbol, isNumeric }: PasswordProps) => {
  if (isUpperCase !== undefined) setUpperCase(isUpperCase);
  if (isLowerCase !== undefined) setLowerCase(isLowerCase);
  if (isSymbol !== undefined) setSymbols(isSymbol);
  if (isNumeric !== undefined) setNumber(isNumeric);
};

const getSectionTitle = (strength: number): string => {
  switch (strength) {
    case 0:
      return "Don't use this password";
    case 1:
      return "Very weak password";
    case 2:
      return "Weak password";
    case 3:
      return "Strong password";
    case 4:
      return "Very strong password";
    default:
      return "Don't use this password";
  }
};

const getIcon = (strength: number): string => {
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
      return "🟣";
  }
};

const generateSegmentedPassword = (pwdLength = 12) => {
  const options = { isUpperCase: true, isLowerCase: true, isSymbol: false, isNumeric: true };

  const segments = Math.floor(pwdLength / 4);

  const password = Array(segments)
    .fill(0)
    .map((_, index) => {
      setOptions(options);
      const length = index === 0 ? 4 : 3;
      setPasswordLength(length);
      return passwordCharacters();
    })
    .join("-");

  const details = getPasswordDetails(password);

  return {
    password,
    options,
    icon: getIcon(details.score),
    strength: details.score,
    accessoryTitle: `guessed in ${details.crackTime}`,
    subtitle: details.warning,
    sectionTitle: getSectionTitle(details.score),
    sequence: details.sequence,
  };
};

const generatePassword = (pwdLength = 12, passwordProps?: PasswordProps) => {
  const defaultPasswordOptions = { isUpperCase: true, isLowerCase: true, isSymbol: true, isNumeric: true };

  setPasswordLength(pwdLength);

  const options = passwordProps ?? defaultPasswordOptions;

  setOptions(options);

  const password = passwordCharacters();

  const details = getPasswordDetails(password);

  return {
    password,
    options,
    icon: getIcon(details.score),
    strength: details.score,
    accessoryTitle: `guessed in ${details.crackTime}`,
    subtitle: details.warning,
    sectionTitle: getSectionTitle(details.score),
    sequence: details.sequence,
  };
};

export const generatePasswords = (passwordLength: number): Utils[] => {
  const options = [
    {
      isLowerCase: false,
      isUpperCase: false,
      isNumeric: true,
      isSymbol: false,
    },
    {
      isLowerCase: false,
      isUpperCase: false,
      isNumeric: true,
      isSymbol: true,
    },
    {
      isLowerCase: true,
      isUpperCase: false,
      isNumeric: false,
      isSymbol: false,
    },
    {
      isLowerCase: true,
      isUpperCase: true,
      isNumeric: false,
      isSymbol: false,
    },
    {
      isLowerCase: true,
      isUpperCase: true,
      isNumeric: true,
      isSymbol: false,
    },
    {
      isLowerCase: true,
      isUpperCase: false,
      isNumeric: false,
      isSymbol: true,
    },
    {
      isUpperCase: true,
      isLowerCase: true,
      isNumeric: true,
      isSymbol: true,
    },
  ];

  const segmentedPassword = generateSegmentedPassword(passwordLength);

  return options.map((option) => generatePassword(passwordLength, option)).concat(segmentedPassword);
};

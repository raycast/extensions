import { isEmpty } from "./common-utils";

export enum Case {
  NATIVE = "Native",
  CAMEL = "Camel",
  PASCAL = "Pascal",
  SNAKE = "Snake",
  KEBAB = "Kebab",
  UPPER = "Upper",
  LOWER = "Lower",
  TITLE = "Title",
}
export const getNativeCase = (input: { str: string; case: Case }) => {
  switch (input.case) {
    case Case.NATIVE: {
      return input.str;
    }
    case Case.CAMEL: {
      return camelOrPascalToNative(input.str);
    }
    case Case.PASCAL: {
      return camelOrPascalToNative(input.str);
    }
    case Case.SNAKE: {
      return snakeOrKebabToNative(input.str);
    }
    case Case.KEBAB: {
      return snakeOrKebabToNative(input.str);
    }
    case Case.UPPER: {
      return input.str.toLowerCase();
    }
    case Case.LOWER: {
      return input.str;
    }
    case Case.TITLE: {
      return input.str;
    }
    default: {
      return input.str;
    }
  }
};

export const regexPunctuation = /\p{Z}|\p{P}|\p{S}/gu;

function isUpper(char: string) {
  return !/\d/.test(char) && char !== char.toLowerCase();
}

export const camelOrPascalToNative = (input: string) => {
  let finalStr = input.replaceAll(" ", "");
  try {
    let outString = "";
    finalStr.split("").forEach((value, index) => {
      if (index === 0) {
        outString = outString + value.toLowerCase();
      } else {
        isUpper(value) ? (outString = outString + " " + value.toLowerCase()) : (outString = outString + value);
      }
    });
    finalStr = outString;
  } catch (e) {
    console.error(String(e));
  }
  return finalStr;
};

export const snakeOrKebabToNative = (input: string) => {
  return input.replaceAll(" ", "").replaceAll("-", " ").replaceAll("_", " ");
};

export const nativeToCamel = (input: string) => {
  const inputArray = input.toLowerCase().split(regexPunctuation);
  const outputArray = [];
  if (inputArray.length <= 1) {
    return inputArray[0].toString();
  } else {
    outputArray.push(inputArray[0]);
    for (let i = 1; i < inputArray.length; i++) {
      if (!isEmpty(inputArray[i])) {
        outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toUpperCase()));
      }
    }
    const _input = outputArray.join("");
    return _input.replace(_input[0], _input[0].toLowerCase());
  }
};

export const nativeToPascal = (input: string) => {
  const inputArray = input.toLowerCase().split(regexPunctuation);
  const outputArray = [];
  for (let i = 0; i < inputArray.length; i++) {
    if (!isEmpty(inputArray[i])) {
      outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toUpperCase()));
    }
  }
  return outputArray.join("");
};

export const nativeToSnake = (input: string) => {
  const inputArray = input.toLowerCase().split(regexPunctuation);
  const outputArray = [];
  for (let i = 0; i < inputArray.length; i++) {
    if (!isEmpty(inputArray[i])) {
      outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toLowerCase()));
    }
  }
  return outputArray.join("_");
};

export const nativeToKebab = (input: string) => {
  const inputArray = input.toLowerCase().split(regexPunctuation);
  const outputArray = [];
  for (let i = 0; i < inputArray.length; i++) {
    if (!isEmpty(inputArray[i])) {
      outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toLowerCase()));
    }
  }
  return outputArray.join("-");
};

export const nativeToUpper = (input: string) => {
  return input.toUpperCase();
};

export const nativeToLower = (input: string) => {
  return input.toLowerCase();
};

export const nativeToTitle = (input: string) => {
  const inputArray = input.toLowerCase().split(regexPunctuation);
  const outputArray = [];
  for (let i = 0; i < inputArray.length; i++) {
    outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toUpperCase()));
  }
  return outputArray.join(" ");
};

import { randomInt } from "crypto";
import { PersonalNumberObject } from "./types";

export function generatePN(age: number, gender: "male" | "female") {
  const birthYear = new Date().getFullYear() - age;

  const monthString = randomInt(1, 12).toString().padStart(2, "0");
  const dayString = randomInt(1, 29).toString().padStart(2, "0");

  const extraDigits = randomInt(0, 99);

  const extraDigitsString = extraDigits < 10 ? `0${extraDigits}` : `${extraDigits}`;

  const genderNumber = randomInt(0, 4) * 2 + (gender === "male" ? 1 : 0);

  const totalString = `${birthYear.toString().substring(2)}${monthString}${dayString}${extraDigitsString}${genderNumber}`;

  const checkSum = totalString
    .split("")
    .map((char, index) => {
      const digit = parseInt(char);
      const multiplier = index % 2 === 0 ? 2 : 1;

      const product = digit * multiplier;

      return product > 9 ? product - 9 : product;
    })
    .reduce((acc, curr) => acc + curr, 0);

  const controlDigit = (10 - (checkSum % 10)) % 10;

  const bb = totalString + controlDigit.toString();

  return birthYear.toString().substr(0, 2) + bb;
}

export function generatePNItem(
  age: number,
  gender: "male" | "female",
  whenUsed: (pn: PersonalNumberObject) => void,
): PersonalNumberObject & { onUse: () => void } {
  const pnObject = {
    pn: generatePN(age, gender),
    age,
    gender,
  };

  return {
    ...pnObject,
    onUse: () => whenUsed(pnObject),
  };
}

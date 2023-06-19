import fs from "fs";
import { shuffle } from "lodash";
import { resolve } from "path";
import { environment } from "@raycast/api";

// Load the word list from file
const filePath = resolve(environment.assetsPath, "The_Oxford_3000.txt");
const words = fs.readFileSync(filePath, "utf8").split("\n");

// Define the leet speak rules
const leetRules: Record<string, string[]> = {
  a: ["a", "A", "4", "@"],
  b: ["b", "B", "8"],
  c: ["c", "C", "("],
  d: ["d", "D"],
  e: ["e", "E", "3", "&"],
  f: ["f", "F"],
  g: ["g", "G", "9"],
  h: ["h", "H"],
  i: ["i", "I", "1", "!"],
  j: ["j", "J"],
  k: ["k", "K"],
  l: ["l", "L", "1"],
  m: ["m", "M"],
  n: ["n", "N"],
  o: ["o", "O", "0"],
  p: ["p", "P"],
  q: ["q", "Q", "9"],
  r: ["r", "R"],
  s: ["s", "S", "5", "$"],
  t: ["t", "T", "7", "+"],
  u: ["u", "U"],
  v: ["v", "V"],
  w: ["w", "W"],
  x: ["x", "X"],
  y: ["y", "Y"],
  z: ["z", "Z", "2"],
};

export interface PasswordData {
  password: string;
  plaintext: string;
  strength: number;
}

// Password strength evaluation function
const evaluatePasswordStrength = (password: string): number => {
  const strengthRules = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/];
  return strengthRules.reduce((strength, rule) => (rule.test(password) ? strength + 1 : strength), 0);
};

// Password generation function
const generatePassword = async (
  wordCount: number,
  passwordCount: number,
  maxIterations = 1000
): Promise<PasswordData[]> => {
  const passwordData: PasswordData[] = [];
  for (let c = 0; c < passwordCount; c++) {
    let password = "";
    let plaintext = "";
    let iterationCount = 0;

    while (iterationCount < maxIterations) {
      plaintext = shuffle(words).slice(0, wordCount).join(" ");

      password = Array.from(plaintext)
        .map((letter) => shuffle(leetRules[letter] || [letter])[0])
        .join("");

      if (evaluatePasswordStrength(password) >= 4) {
        break;
      }

      password = "";
      iterationCount++;
    }

    const strength = evaluatePasswordStrength(password);

    passwordData.push({ password: password.replace(/ /g, "-"), plaintext, strength });
  }

  return passwordData;
};

export default generatePassword;

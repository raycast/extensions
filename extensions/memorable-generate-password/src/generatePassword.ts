import fs from "fs";
import { resolve } from "path";
import { environment } from "@raycast/api";

import { pinyin } from "pinyin-pro";

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

export type CasingMode = "lowercase" | "uppercase" | "pascalcase" | "random";
export type WordListType = "oxford" | "idioms" | "poetry" | "tech" | "nature" | "custom";

export interface PasswordOptions {
  wordCount: number;
  passwordCount: number;
  separator: string;
  casing: CasingMode;
  wordListType: WordListType;
  customPath?: string;
  useLeetSpeak: boolean;
  prefix?: string;
  suffix?: string;
}

export interface PasswordData {
  password: string;
  plaintext: string;
  strength: number;
  entropy: number;
}

// Global word list cache to avoid frequent I/O
const cachedWordLists: Record<string, string[]> = {};

const loadWords = (type: WordListType, customPath?: string): string[] => {
  const cacheKey = type === "custom" ? `custom:${customPath}` : type;
  if (cachedWordLists[cacheKey]) return cachedWordLists[cacheKey];

  let filePath = "";
  switch (type) {
    case "oxford":
      filePath = resolve(environment.assetsPath, "The_Oxford_3000.txt");
      break;
    case "idioms":
      filePath = resolve(environment.assetsPath, "Chinese_Idioms.txt");
      break;
    case "poetry":
      filePath = resolve(environment.assetsPath, "Chinese_Poetry.txt");
      break;
    case "tech":
      filePath = resolve(environment.assetsPath, "Tech_Words.txt");
      break;
    case "nature":
      filePath = resolve(environment.assetsPath, "Nature_Words.txt");
      break;
    case "custom":
      filePath = customPath || "";
      break;
  }

  try {
    if (!filePath || !fs.existsSync(filePath)) throw new Error("File not found");
    const content = fs.readFileSync(filePath, "utf8");
    const words = content
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    cachedWordLists[cacheKey] = words;
    return words;
  } catch (error) {
    console.error(`Failed to load word list (${type}):`, error);
    return ["security", "password", "memorable"];
  }
};

const evaluatePasswordStrength = (password: string): number => {
  const strengthRules = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/];
  return strengthRules.reduce((strength, rule) => (rule.test(password) ? strength + 1 : strength), 0);
};

const calculateEntropy = (password: string): number => {
  if (password.length === 0) return 0;

  // Calculate actual charset size based on character types present
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/\d/.test(password)) charsetSize += 10;

  // Count unique special characters actually used
  const specialChars = password.match(/[^a-zA-Z0-9]/g);
  if (specialChars) {
    const uniqueSpecialChars = new Set(specialChars).size;
    charsetSize += uniqueSpecialChars;
  }

  if (charsetSize === 0) return 0;

  // Entropy = length * log2(charset size)
  return password.length * Math.log2(charsetSize);
};

const getRandomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];

const applyCasing = (word: string, mode: CasingMode): string => {
  switch (mode) {
    case "lowercase":
      return word.toLowerCase();
    case "uppercase":
      return word.toUpperCase();
    case "pascalcase":
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    case "random":
      return Math.random() > 0.5 ? word.toUpperCase() : word.toLowerCase();
    default:
      return word;
  }
};

const convertToPinyin = (text: string): string => {
  // Convert Chinese characters to Pinyin without tone and without spaces
  return pinyin(text, { toneType: "none", type: "array" }).join("");
};

const generatePassword = async (options: PasswordOptions): Promise<PasswordData[]> => {
  const words = loadWords(options.wordListType, options.customPath);
  const passwordData: PasswordData[] = [];

  for (let c = 0; c < options.passwordCount; c++) {
    let password = "";
    let plaintext = "";
    let iterationCount = 0;
    const maxIterations = 50;

    while (iterationCount < maxIterations) {
      const selectedWords = Array.from({ length: options.wordCount }, () => getRandomItem(words));
      plaintext = selectedWords.join(" ");

      // Convert selected words to pinyin if they are Chinese
      const processWord = (w: string) => {
        const isChinese = /[\u4e00-\u9fa5]/.test(w);
        return isChinese ? convertToPinyin(w) : w;
      };

      const casedWords = selectedWords.map((w) => applyCasing(processWord(w), options.casing));

      let intermediate = casedWords.join(options.separator);

      if (options.useLeetSpeak) {
        intermediate = Array.from(intermediate)
          .map((letter) => {
            const char = letter.toLowerCase();
            const replacements = leetRules[char];
            return replacements ? getRandomItem(replacements) : letter;
          })
          .join("");
      }

      password = (options.prefix || "") + intermediate + (options.suffix || "");

      if (evaluatePasswordStrength(password) >= (options.useLeetSpeak ? 3 : 2)) {
        break;
      }
      iterationCount++;
    }

    passwordData.push({
      password,
      plaintext,
      strength: evaluatePasswordStrength(password),
      entropy: calculateEntropy(password),
    });
  }

  return passwordData;
};

export default generatePassword;

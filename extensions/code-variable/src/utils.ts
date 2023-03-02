import config from "./config";
import { difference, union, sample } from "lodash-es";

const { keys, commands, filter } = config;

export function isStartWithCommand(str: string) {
  return commands.includes(getCommand(str));
}

export function getCommand(str: string) {
  return str.substring(0, 3);
}

export function getTranslateUrl(q: string) {
  const selected = sample(keys) as { keyfrom: string; key: string };
  const url = {
    keyfrom: selected.keyfrom,
    key: selected.key,
    type: "data",
    doctype: "json",
    version: "1.1",
    q,
  };
  return `http://fanyi.youdao.com/openapi.do?${new URLSearchParams(url).toString()}`;
}

function filterStr(str: string): string[] {
  str = str.toLowerCase();
  const { prep, prefix, suffix, verb } = filter;
  return difference(str.split(" "), union(prep, prefix, suffix, verb));
}

function toCamelCase(words: string[]): string {
  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).map((word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return firstWord + restWords.join("");
}

function toUpperCamelCase(words: string[]): string {
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
}

function toUnderline(words: string[]): string {
  return words.map((word) => word.toLowerCase()).join("_");
}

function toHyphenated(words: string[]): string {
  return words.map((word) => word.toLowerCase()).join("-");
}

function toConst(words: string[]): string {
  return words.map((word) => word.toUpperCase()).join("_");
}

export function format(str: string, command: string) {
  const words = filterStr(str);
  switch (command) {
    case "xt ":
      return toCamelCase(words);
    case "dt ":
      return toUpperCamelCase(words);
    case "xh ":
      return toUnderline(words);
    case "zh ":
      return toHyphenated(words);
    case "cl ":
      return toConst(words);
    default:
      return "";
  }
}

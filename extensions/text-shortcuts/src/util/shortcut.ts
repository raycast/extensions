import { Color, Icon, LocalStorage } from "@raycast/api";
import { Md5 } from "ts-md5";
import { buildRegexp, calculateCharacter, camelCaseToOtherCase, isEmpty, regexPunctuation } from "./utils";

import title from "title";

export enum Tags {
  ANNOTATION = "Annotation",
  CASE = "Case",
  CODER = "Coder",
  DELETION = "Deletion",
  FORMAT = "Format",
  MARKDOWN = "Markdown",
  REPLACEMENT = "Replacement",
  TIME = "Time",
  OTHER = "Other",
}

export const tags = Object.values(Tags);

export const icons = Object.entries(Icon);

export const iconColors = Object.entries(Color);

enum Cases {
  UPPER = "UPPER CASE",
  LOWER = "lower case",
  TITLE = "Title case",
  CAMEL = "camelCase",
  PASCAL = "PascalCase",
  SNAKE = "snake_case",
  KEBAB = "kebab-case",
  CAMEL_TO_SNAKE = "camelCase to snake_case",
  CAMEL_TO_KEBAB = "camelCase to kebab-case",
}

export const cases = Object.values(Cases);

enum Coders {
  ENCODER_BASE64 = "Encoder Base64",
  DECODER_BASE64 = "Decoder Base64",
  ENCODER_MD5 = "Encoder MD5",
  ENCODER_URL = "Encoder URL",
  DECODER_URL = "Decoder URL",
  ENCODER_URL_COMPONENT = "Encoder URL Component",
  DECODER_URL_COMPONENT = "Decoder URL Component",
  ENCODER_ESCAPE = "Encoder Escape",
  DECODER_ESCAPE = "Decoder Escape",
}

export const coders = Object.values(Coders);

enum Transform {
  STAMP_TO_TIME_LOCAL = "Stamp to time",
  FORMAT_JSON = "Format JSON",
  TRIM_LINE = "Trim line",
  Sort_LINE1 = "Sort line by A-Z",
  Sort_LINE2 = "Sort line by Z-A",
}

export const transforms = Object.values(Transform);

export interface ShortcutInfo {
  name: string;
  id: string;
  icon: Icon;
  iconColor?: Color;
  source: ShortcutSource; //0 from default, 1 from user
  visibility: boolean;
  tag: string[];
}

export enum ShortcutSource {
  BUILD_IN = "Build-in",
  USER = "User",
}

export enum TactionType {
  DELETE = "Delete",
  CODER = "Encode & Decode",
  REPLACE = "Replace",
  AFFIX = "Live Template",
  CASE = "Name Case",
  TRANSFORM = "Transform",
}

export interface Taction {
  type: TactionType;
  content: string[];
}

export class Shortcut {
  id: string;
  info: ShortcutInfo;
  tactions: Taction[];

  constructor(
    info: ShortcutInfo = {
      name: "",
      id: "",
      iconColor: Color.Blue,
      icon: icons[0][1],
      source: ShortcutSource.USER,
      visibility: true,
      tag: [] as string[],
    },
    tactions: Taction[] = [],
  ) {
    this.id = info.id;
    this.info = info;
    this.tactions = tactions;
  }
}

export function checkInfo(name: string, tactions: Taction[]) {
  const isValid = { nameValid: true, tactionCountValid: true, tactionContentValid: { actionIndex: "", valid: true } };
  if (isEmpty(name)) {
    isValid.nameValid = false;
  }
  if (tactions.length == 0) {
    isValid.tactionCountValid = false;
  } else {
    tactions.map((value, index) => {
      value.content.map((value2) => {
        if (isEmpty(value2)) {
          const _index = index + 1;
          isValid.tactionContentValid.actionIndex = isValid.tactionContentValid.actionIndex + " " + _index;
          isValid.tactionContentValid.valid = false;
        }
      });
    });
  }
  return isValid;
}

export function checkAffix(affix: Taction[]) {
  const reg = [/(\$TEXT\$)/, /(\$LINE\$)/, /(\$WORD\$)/];
  const isValid = { affixIndex: "", valid: true };
  affix.map((value, index) => {
    if (value.type == TactionType.AFFIX) {
      let count = 0;
      reg.map((regex) => {
        if (regex.test(value.content[0])) count++;
      });
      if (count > 1) {
        const _index = index + 1;
        isValid.affixIndex = isValid.affixIndex + " " + _index;
        isValid.valid = false;
      }
    }
  });
  return isValid;
}

export async function createShortcut(info: ShortcutInfo, tactions: Taction[], shortcuts: Shortcut[]) {
  if (info.tag.length == 0) {
    info.tag = [Tags.OTHER];
  }
  tactions = handleLiveTemplate(tactions);
  if (!isEmpty(info.id) && info.id.length > 0) {
    shortcuts.map((value, index) => {
      if (value.info.id == info.id) {
        shortcuts[index] = new Shortcut(info, tactions);
        return;
      }
    });
  } else {
    info.id = "user_" + new Date().getTime();
    info.source = ShortcutSource.USER;
    const _shortcut = new Shortcut(info, tactions);
    shortcuts.unshift(_shortcut);
  }
  await LocalStorage.setItem("shortcuts", JSON.stringify(shortcuts));
}

export function handleLiveTemplate(tactions: Taction[]) {
  for (let i = 0; i < tactions.length; i++) {
    if (tactions[i].type === TactionType.AFFIX) {
      const match = Array.from(tactions[i].content[0].matchAll(/(\$TEXT\$)|(\$LINE\$)|(\$WORD\$)/g));
      if (match.length > 0) {
        tactions[i].content[1] = match[0][0];
      }
    }
  }
  return tactions;
}

export function runShortcut(input: string, tactions: Taction[]) {
  try {
    let output = input;
    tactions.map((value) => {
      switch (value.type) {
        case TactionType.DELETE: {
          const searchValue = buildRegexp(value.content[0]);
          if (typeof searchValue == "string") {
            output = output.replaceAll(searchValue, "");
          } else {
            output = output.replace(searchValue, "");
          }
          output = output.length === 0 ? " " : output;
          break;
        }
        case TactionType.REPLACE: {
          const searchValue = buildRegexp(value.content[0]);
          if (typeof searchValue == "string") {
            output = output.replaceAll(searchValue, isEmpty(value.content[1]) ? "" : value.content[1]);
          } else {
            output = output.replace(searchValue, isEmpty(value.content[1]) ? "" : value.content[1]);
          }
          output = output.length === 0 ? " " : output;
          break;
        }
        case TactionType.AFFIX: {
          output = tactionAffix(output, value);
          break;
        }
        case TactionType.CASE: {
          output = tactionCase(output, value);
          break;
        }
        case TactionType.CODER: {
          output = tactionCoder(output, value);
          break;
        }
        case TactionType.TRANSFORM: {
          output = tactionTransform(output, value);
          break;
        }
      }
    });
    return output;
  } catch (e) {
    console.error("runShortcut " + String(e));
    return input;
  }
}

function tactionAffix(input: string, taction: Taction) {
  const date = new Date();
  let output = taction.content[0];
  output = output.replaceAll(/(\$YEAR\$)/g, date.getFullYear() + "");
  output = output.replaceAll(
    /(\$MONTH\$)/g,
    date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1 + "",
  );
  output = output.replaceAll(/(\$DAY\$)/g, date.getDate() < 10 ? "0" + date.getDate() : date.getDate() + "");
  output = output.replaceAll(/(\$HOUR\$)/g, date.getHours() < 10 ? "0" + date.getHours() : date.getHours() + "");
  output = output.replaceAll(
    /(\$MINUTE\$)/g,
    date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes() + "",
  );
  output = output.replaceAll(
    /(\$SECOND\$)/g,
    date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds() + "",
  );
  output = output.replaceAll(/(\$TIMESTAMP\$)/g, date.getTime() + "");

  //calculate statistics
  const _cc = calculateCharacter(input);
  const statistics = `
Statistics
Text length: ${_cc.textLength}
English character: ${_cc.englishCharacter}
Chinese character: ${_cc.chineseCharacter}
Line count: ${_cc.line}
Number count: ${_cc.numberCharacter}
Punctuation count: ${_cc.punctuationCharacter}
Character without space: ${_cc.characterWithoutSpace}
Character without punctuation: ${_cc.characterWithoutPunctuation}
`;
  output = output.replaceAll(/(\$STATISTICS\$)/g, statistics);

  if (taction.content.length > 1) {
    switch (taction.content[1]) {
      case "$TEXT$": {
        output = output.replaceAll(/(\$TEXT\$)/g, input);
        break;
      }
      case "$LINE$": {
        const inputArray = input.split(/\n/g);
        const outputArray: string[] = [];
        let _output = "";
        for (let i = 0; i < inputArray.length; i++) {
          outputArray.push(output.replaceAll(/(\$LINE\$)/g, inputArray[i]));
          _output = _output + outputArray[i] + (i == inputArray.length - 1 ? "" : "\n");
        }
        output = _output;
        break;
      }
      case "$WORD$": {
        const lineArray = input.split(/\n/g);
        const outputLineArray: string[] = [];
        let _outLine = "";

        for (let i = 0; i < lineArray.length; i++) {
          const wordArray = lineArray[i].split(/\s/gu);
          const outputArray: string[] = [];
          let _output = "";
          for (let j = 0; j < wordArray.length; j++) {
            if (wordArray[j].length > 0) {
              outputArray.push(output.replaceAll(/(\$WORD\$)/g, wordArray[j]));
              _output = _output + outputArray[j] + (j == wordArray.length - 1 ? "" : " ");
            } else {
              outputArray.push("");
            }
          }
          outputLineArray.push(_output);
          _outLine = _outLine + outputLineArray[i] + (i == lineArray.length - 1 ? "" : "\n");
        }
        output = _outLine;
        break;
      }
    }
  }

  output = output.replaceAll("$LINEBREAK$", "\n");

  return output;
}

function tactionCase(input: string, taction: Taction) {
  switch (taction.content[0]) {
    case Cases.UPPER: {
      return input.toUpperCase();
    }
    case Cases.LOWER: {
      return input.toLowerCase();
    }
    case Cases.TITLE: {
      return title(input);
    }
    case Cases.CAMEL: {
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
    }
    case Cases.PASCAL: {
      const inputArray = input.toLowerCase().split(regexPunctuation);
      const outputArray = [];
      for (let i = 0; i < inputArray.length; i++) {
        if (!isEmpty(inputArray[i])) {
          outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toUpperCase()));
        }
      }
      return outputArray.join("");
    }
    case Cases.SNAKE: {
      const inputArray = input.toLowerCase().split(regexPunctuation);
      const outputArray = [];
      for (let i = 0; i < inputArray.length; i++) {
        if (!isEmpty(inputArray[i])) {
          outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toLowerCase()));
        }
      }
      return outputArray.join("_");
    }
    case Cases.KEBAB: {
      const inputArray = input.toLowerCase().split(regexPunctuation);
      const outputArray = [];
      for (let i = 0; i < inputArray.length; i++) {
        if (!isEmpty(inputArray[i])) {
          outputArray.push(inputArray[i].replace(inputArray[i][0], inputArray[i][0].toLowerCase()));
        }
      }
      return outputArray.join("-");
    }
    case Cases.CAMEL_TO_SNAKE: {
      return camelCaseToOtherCase(input, "_");
    }
    case Cases.CAMEL_TO_KEBAB: {
      return camelCaseToOtherCase(input, "-");
    }
    default:
      return input;
  }
}

function tactionCoder(input: string, taction: Taction) {
  switch (taction.content[0]) {
    case Coders.ENCODER_BASE64: {
      return Buffer.from(input, "utf-8").toString("base64");
    }
    case Coders.DECODER_BASE64: {
      return Buffer.from(input, "base64").toString("utf-8");
    }
    case Coders.ENCODER_MD5: {
      return Md5.hashStr(input);
    }
    case Coders.ENCODER_URL: {
      return encodeURI(input);
    }
    case Coders.DECODER_URL: {
      return decodeURI(input);
    }
    case Coders.ENCODER_URL_COMPONENT: {
      return encodeURIComponent(input);
    }
    case Coders.DECODER_URL_COMPONENT: {
      return decodeURIComponent(input);
    }
    case Coders.ENCODER_ESCAPE: {
      return escape(input);
    }
    case Coders.DECODER_ESCAPE: {
      return unescape(input);
    }
    default:
      return input;
  }
}

function tactionTransform(input: string, taction: Taction) {
  switch (taction.content[0]) {
    case Transform.STAMP_TO_TIME_LOCAL: {
      if (/^[0-9]*$/.test(input)) {
        return new Date(Number(input)).toLocaleString();
      } else {
        return input;
      }
    }
    case Transform.FORMAT_JSON: {
      try {
        return JSON.stringify(JSON.parse(input), null, 2);
      } catch (e) {
        return input;
      }
    }
    case Transform.TRIM_LINE: {
      const inputArray = input.split(/\n/g);
      let _output = "";
      for (let i = 0; i < inputArray.length; i++) {
        _output = _output + inputArray[i].trim() + (i == inputArray.length - 1 ? "" : "\n");
      }
      return _output;
    }
    case Transform.Sort_LINE1: {
      const inputArray = input.split(/\n/g);
      let _output = "";
      inputArray.sort();
      for (let i = 0; i < inputArray.length; i++) {
        _output = _output + inputArray[i] + (i == inputArray.length - 1 ? "" : "\n");
      }
      return _output;
    }
    case Transform.Sort_LINE2: {
      const inputArray = input.split(/\n/g);
      let _output = "";
      inputArray.sort().reverse();
      for (let i = 0; i < inputArray.length; i++) {
        _output = _output + inputArray[i] + (i == inputArray.length - 1 ? "" : "\n");
      }
      return _output;
    }
    default:
      return input;
  }
}

import { Arg } from "./datasource";
import { Clipboard } from "@raycast/api";

export const getArguments = (userInput: string): string[] => {
  const argArray: string[] = [];
  if (!userInput) {
    return argArray;
  }

  // not match {{}}
  const newUserInput = userInput.replace("{{}}", "");

  const reg = /\{\{(.+?)\}\}/g;
  let match;
  while ((match = reg.exec(newUserInput)) !== null) {
    argArray.push(match[1].trim());
  }

  return argArray;
};

export const getNewArguments = (newArgs: string[], oldArgObjs: Arg[]): Arg[] => {
  let newArgsArray = oldArgObjs;

  if (newArgs.length === 0) {
    return [];
  }

  if (!newArgsArray) {
    newArgsArray = [];
  }

  // remove old args not in new args
  newArgsArray = newArgsArray.filter((item) => newArgs.map((arg) => arg.trim()).includes(item.name));

  for (const arg of newArgs) {
    const key = arg.trim();
    if (!key) {
      continue;
    }
    // remove old args not in new args
    if (!newArgsArray.find((item) => item.name === key)) {
      newArgsArray = newArgsArray.filter((item) => item.name !== key);
    } else {
      continue;
    }

    newArgsArray.push({ name: key, value: "" });
  }

  return newArgsArray;
};

export const replaceArgumentPlaceholders = async (template: string, argumentValues: Arg[]): Promise<string> => {
  let processedTemplate = template;

  // Check if there is a clipboard argument
  const hasClipboardArg = argumentValues.some((arg) => arg.name === "clipboard");
  let clipboardText = "";

  // If there is a clipboard argument, read the clipboard content
  if (hasClipboardArg) {
    clipboardText = (await Clipboard.readText()) || "";
  }

  for (const argumentValue of argumentValues) {
    let valueToReplace = argumentValue.value;

    // If it's a clipboard argument, use the clipboard content
    if (argumentValue.name === "clipboard") {
      valueToReplace = clipboardText;
    }

    if (valueToReplace.length > 0) {
      const placeholderPattern = `{{\\s*${argumentValue.name}\\s*}}`;
      const placeholderRegex = new RegExp(placeholderPattern, "g");
      processedTemplate = processedTemplate.replace(placeholderRegex, valueToReplace);
    }
  }
  return processedTemplate;
};

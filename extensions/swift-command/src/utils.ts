import { Arg } from "./datasource";

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

export const replaceArgumentPlaceholders = (template: string, argumentValues: Arg[]): string => {
  let processedTemplate = template;
  for (const argumentValue of argumentValues) {
    if (argumentValue.value.length > 0) {
      const placeholderPattern = `{{\\s*${argumentValue.name}\\s*}}`;
      const placeholderRegex = new RegExp(placeholderPattern, "g");
      processedTemplate = processedTemplate.replace(placeholderRegex, argumentValue.value);
    }
  }
  return processedTemplate;
};

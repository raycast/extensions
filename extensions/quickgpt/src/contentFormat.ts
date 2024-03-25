type SpecificReplacements = {
  query?: string;
  clipboard?: string;
  selection?: string;
};

const literalPlaceholder = {
  query: "<输入文本>",
  clipboard: "<剪贴板文本>",
  selection: "<选中文本>",
};

const inputPlaceholder: { [key: string]: keyof SpecificReplacements } = {
  i: "query",
  s: "selection",
  c: "clipboard",
};

const generateCombinations = (arr: string[]): string[] => {
  if (arr.length === 1) return arr;
  const combinations = [];
  for (let i = 0; i < arr.length; i++) {
    combinations.push(arr[i]);
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const restCombination of generateCombinations(rest)) {
      combinations.push(`${arr[i]}|${restCombination}`);
    }
  }
  return combinations;
};

const allCombinations = generateCombinations(Object.keys(inputPlaceholder));

export function contentFormat(text: string, specificReplacements: SpecificReplacements): [string, string[]] {
  const compositeReplacements: { [key: string]: string | undefined } = {};
  for (const combination of allCombinations) {
    const keysInCombination = combination.split("|");
    for (const key of keysInCombination) {
      if (specificReplacements[inputPlaceholder[key]]) {
        compositeReplacements[`{{${combination}}}`] = specificReplacements[inputPlaceholder[key]];
        compositeReplacements[`{{p:${combination}}}`] = literalPlaceholder[inputPlaceholder[key]];
        break;
      }
    }
  }

  const missingTags: string[] = [];
  for (const tag of Object.keys(compositeReplacements)) {
    const value = compositeReplacements[tag];
    if (value) {
      text = text.split(tag).join(value);
    } else if (text.includes(tag)) {
      missingTags.push(tag);
      text = "";
    }
  }

  return [text, missingTags];
}

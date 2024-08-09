// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReplacePlaceholders(obj: any, prompt: string): string {
  return prompt.replace(/\{([^{}]+)\}/g, (match, p1) => {
    const value = GetNestedValue(obj, p1);
    return value !== undefined ? value : match;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function GetNestedValue(obj: any, param: string): string | undefined {
  if (param === "question") {
    param = "question->text";
  }
  const keys = param.split("->");

  return keys.reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
      2;
    }
    return undefined;
  }, obj);
}

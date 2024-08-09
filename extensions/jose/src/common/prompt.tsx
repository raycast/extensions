import { BaseMessageChunk } from "@langchain/core/messages";

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

export const CurrentDate = () => {
  const date = new Date();

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekday = weekdays[date.getDay()];

  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // months are 0-based in JS
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${weekday}, ${month}/${day}/${year} ${hours}:${minutes}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ParseFunctionCall = (result: BaseMessageChunk): { name: string; args: any } | null => {
  if (result?.additional_kwargs?.function_call === undefined) {
    return null;
  }
  return {
    name: result.additional_kwargs.function_call.name,
    args: JSON.parse(result.additional_kwargs.function_call.arguments),
  };
};

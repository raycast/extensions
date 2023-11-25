import { ParsedPage } from "./types";

type SplitResult = { type: "text"; text: { content: string } } | { type: "equation"; equation: { expression: string } };

export function splitTextAndEquations(inputString: string): SplitResult[] {
  return inputString.split(/(\$[^$]*\$)/g).reduce((acc: SplitResult[], value: string, index: number) => {
    if (value !== "") {
      if (index % 2 === 0) {
        acc.push({ type: "text", text: { content: value } });
      } else {
        acc.push({ type: "equation", equation: { expression: value.slice(1, -1) } });
      }
    }
    return acc;
  }, []);
}

function getTitle(pageProperties: any) {
  if (Object.keys(pageProperties).includes("title")) {
    return pageProperties.title.title[0].plain_text;
  } else {
    return pageProperties.Title.title[0].plain_text;
  }
}

export function parsePage(page: any): ParsedPage {
  try {
    return {
      id: page.id,
      title: getTitle(page.properties),
      icon: page.icon?.type === "emoji" ? page.icon.emoji : "",
    };
  } catch (e: any) {
    throw new Error("Page must have a title");
  }
}

import { pinyin } from "pinyin-pro";

import { Project } from "../types";

export function generateProjectKeywords(project: Project) {
  const keywords: string[] = [];

  keywords.push(project.name.toLowerCase());
  keywords.push(project.path.toLowerCase());

  const pathSegments = project.path.toLowerCase().split("/").filter(Boolean);
  keywords.push(...pathSegments);

  project.aliases.forEach((alias) => {
    keywords.push(alias.toLowerCase());
  });

  if (containsChinese(project.name)) {
    const fullPinyin = pinyin(project.name, { toneType: "none", type: "array" });
    keywords.push(fullPinyin.join(""));

    const firstLetters = fullPinyin.map((item) => item[0]);
    keywords.push(firstLetters.join(""));
  }

  return keywords;
}

function containsChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

// src/utils/imageMap.ts
export type SupportedLanguage = "javascript" | "go" | "python" | "swift";

export const logoMap: { [key in SupportedLanguage]: string } = {
  javascript: "../assets/icons/javascript-original.svg",
  go: "../assets/icons/go-original.svg",
  python: "../assets/icons/python-original.svg",
  swift: "../assets/icons/swift-original.svg",
};

import { environment } from "@raycast/api";

export const isDark = environment.appearance === "dark";

export const muteIfPrivate = (p: boolean) => {
  if (isDark) return p ? undefined : "#777";
  return p ? "#000" : "#aaa";
};

export const wrapCode = (code = "") => {
  if (!code) return "";
  return `\`\`\`typescript\n${code}\n\`\`\``;
};

import json2md from "json2md";

export const toMarkdown = (...args: Parameters<json2md>) => {
  return json2md(...args);
};

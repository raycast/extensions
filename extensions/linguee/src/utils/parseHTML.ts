import { parse } from "node-html-parser";

export const parseHTML = (html?: string): ReturnType<typeof parse> | undefined => {
  return html ? parse(html) : undefined;
};

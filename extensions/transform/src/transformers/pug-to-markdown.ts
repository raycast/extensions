import pug from "pug";
import { htmlToMarkdown } from "../lib/markdown";

export const TransformPugToMarkdown = {
  from: "Pug",
  to: "Markdown",
  transform: async (value: string) => {
    const html = pug.compile(value)({});
    return htmlToMarkdown(html);
  },
};

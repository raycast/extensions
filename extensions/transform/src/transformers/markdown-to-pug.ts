import md from "markdown-it";
import { TransformHTMLToPug } from "./html-to-pug";

export const TransformMarkdownToPug = {
  from: "Markdown",
  to: "Pug",
  transform: (value: string) => TransformHTMLToPug.transform(md().render(value)),
};

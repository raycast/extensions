import pug from "pug";

export const TransformPugToHTML = {
  from: "Pug",
  to: "HTML",
  transform: (value: string) => pug.compile(value)(),
};

import HTMLtoJSX from "htmltojsx";

const converter = new HTMLtoJSX({
  createClass: false,
});

export const TransformHTMLToJSX = {
  from: "HTML",
  to: "JSX",
  transform: (value: string) => converter.convert(value),
};

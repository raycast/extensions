import html2pug from "html2pug";

export const TransformHTMLToPug = {
  from: "HTML",
  to: "Pug",
  transform: async (value: string) => {
    return await html2pug(value, {
      fragment: !/^<!doctype/.test(value) || !/^<html/.test(value),
    });
  },
};

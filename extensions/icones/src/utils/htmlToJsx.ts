function transformToReactJSX(jsx: string) {
  const reactJSX = jsx.replace(/(class|(\w+:\w+))=/g, (i) => {
    if (i === "class=") return "className=";
    return i
      .split(":")
      .map((i, idx) => (idx === 0 ? i.toLowerCase() : i[0].toUpperCase() + i.slice(1).toLowerCase()))
      .join("");
  });
  return reactJSX;
}

export function HtmlToJSX(html: string, reactJSX = false) {
  const jsx = html.replace(/([\w-]+)=/g, (i) => {
    const words = i.split("-");
    if (words.length === 1) return i;
    return words
      .map((i, idx) => (idx === 0 ? i.toLowerCase() : i[0].toUpperCase() + i.slice(1).toLowerCase()))
      .join("");
  });
  return reactJSX ? transformToReactJSX(jsx) : jsx;
}

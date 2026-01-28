/**
{
  "api": 1,
  "name": "Toggle Camel and Hyphen",
  "description": "Turns camelCase to camel-case and vice versa",
  "author": "Christian Heilmann",
  "icon": "table",
  "tags": "camelcase,hyphencase,syntax,codestandards"
}
**/

const toggleCamelHyphen = (str) => {
  let chunks = str.split(/\n/);
  chunks.forEach((c, k) => {
    if (c.indexOf("-") !== -1) {
      chunks[k] = c.replace(/\W+(.)/g, (x, chr) => {
        return chr.toUpperCase();
      });
    } else {
      chunks[k] = c
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([0-9])([^0-9])/g, "$1-$2")
        .replace(/([^0-9])([0-9])/g, "$1-$2")
        .replace(/-+/g, "-")
        .toLowerCase();
    }
  });
  return chunks.join("\n");
};

export function main(input) {
  input.text = toggleCamelHyphen(input.text);
}

/**
{
  "api": 1,
  "name": "List to HTML list",
  "description": "Turns comma separated list to HTML Lists",
  "author": "Christian Heilmann",
  "icon": "table",
  "tags": "HTML,Lists"
}
**/

const listToHTML = (str) => {
  if (str.indexOf("<ul>") === -1) {
    let chunks = str.split(",");
    let out = `<ul>
  <li>${chunks.join("</li>\n  <li>")}`;
    return out + "</li>\n</ul>";
  } else {
    let chunks = str.split("<li>");
    let out = [];
    chunks.forEach((c) => {
      out.push(c.match(/[^<]*/));
    });
    out.shift();
    return out.join(",");
  }
};
export function main(input) {
  input.text = listToHTML(input.text);
}

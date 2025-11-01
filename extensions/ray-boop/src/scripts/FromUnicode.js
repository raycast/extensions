/**
  {
    "api":1,
    "name":"From string from unicode scaped",
    "description":"Returns a readable string from the unicode scaped string (js format)",
    "author":"luisfontes19",
    "icon":"broom",
    "tags":"string,normalize,convert,readable,unicode"
  }
**/

export function main(state) {
  state.text = fromUnicode(state.text);
}

function fromUnicode(str) {
  return str
    .split("\\u")
    .map((u) => {
      return String.fromCharCode(parseInt(u, 16));
    })
    .join("");
}

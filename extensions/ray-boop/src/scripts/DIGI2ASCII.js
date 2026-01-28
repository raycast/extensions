/**
{
  "api": 1,
  "name": "Digi to ASCII",
  "description": "Digi to ASCII",
  "author": "Joseph Ng Rong En",
  "icon": "dice",
  "tags": "ascii,digi"
}
**/

function digi2a(str) {
  var split = str.split(/[ ,]+/);
  var arr = [];
  for (var i = 0, l = split.length; i < l; i++) {
    var ascii = String.fromCharCode(split[i]);
    arr.push(ascii);
  }
  return arr.join("");
}

export function main(input) {
  input.text = digi2a(input.text);
}

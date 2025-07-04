/**
{
  "api": 1,
  "name": "Fish PATH Hex Converter",
  "description": "Escapes terminal characters.",
  "author": "Paul Seelman",
  "icon": "broom",
  "tags": "fish_user_paths, fish, hex, ascii, path, var"
}
**/
function convert(string) {
  var chars = string.split("");
  var dict = {
    " ": ":",
    "%": "25",
    "&": "26",
    "+": "2b",
    "-": "2d",
    ".": "2e",
    "*": "2a",
    ":": "3a",
    "@": "40",
    ";": "3b",
  };

  for (var i = chars.length - 1; i >= 0; i--) {
    var char = chars[i];
    var hex = dict[char];

    if (hex !== undefined) {
      var slash_x = "\\x";
      chars[i] = slash_x.concat(hex);
    }
  }

  return chars.join("");
}

export function main(input) {
  input.text = convert(input.text);
}

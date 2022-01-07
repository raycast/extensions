const replacements = [
  [/\*/g, "\\*", "asterisks"],
  [/#/g, "\\#", "number signs"],
  [/\//g, "\\/", "slashes"],
  [/\(/g, "\\(", "parentheses"],
  [/\)/g, "\\)", "parentheses"],
  [/\[/g, "\\[", "square brackets"],
  [/\]/g, "\\]", "square brackets"],
  [/</g, "&lt;", "angle brackets"],
  [/>/g, "&gt;", "angle brackets"],
  [/_/g, "\\_", "underscores"],
  [/=/g, "\n\\=", "equals sign"],
  [/-/g, "\n\\-", "hyphen"],
];

export default function (string: string, skips: [] = []) {
  return replacements.reduce(function (string, replacement) {
    const name: RegExp | string = replacement[2];
    return name && skips.indexOf(name) !== -1 ? string : string.replace(replacement[0], replacement[1]);
  }, string);
}

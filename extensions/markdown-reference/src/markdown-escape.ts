const replacements: Array<Array<RegExp | string>> = [
  [/\*/g, "\\*", "asterisks"],
  [/#/g, "\\#", "plus sign"],
  [/\+/g, "\\+", "number signs"],
  [/\//g, "\\/", "slashes"],
  [/\(/g, "\\(", "parentheses"],
  [/\)/g, "\\)", "parentheses"],
  [/\[/g, "\\[", "square brackets"],
  [/]/g, "\\]", "square brackets"],
  [/</g, "&lt;", "angle brackets"],
  [/>/g, "&gt;", "angle brackets"],
  [/_/g, "\\_", "underscores"],
  [/=/g, "\\=", "equals sign"],
  [/-/g, "\\-", "hyphen"],
];

export default function escapeMd(str: string, skips: (string | RegExp)[] = []) {
  return replacements.reduce((str, replacement) => {
    const name: RegExp | string = replacement[2];
    return name && skips.indexOf(name) !== -1 ? str : str.replace(replacement[0], replacement[1].toString());
  }, str);
}

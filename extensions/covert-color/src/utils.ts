export function trimText(str: string) {
  return str.trim();
}

export function isWord(str: string) {
  return /^[a-zA-Z]+$/g.test(str);
}

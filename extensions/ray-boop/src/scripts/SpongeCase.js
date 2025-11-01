/**
{
  "api": 1,
  "name": "Sponge Case",
  "description": "CoNvERtS yoUR Text To A HIghER fOrM Of CoMMUnICAtIOn",
  "author": "Paul Seelman",
  "icon": "pineapple",
  "tags": "bob,sarcasm,no,this,is,patrick"
}
**/
function spongeText(string) {
  const chars = string.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * Math.floor(2));
    if (j == 0) {
      chars[i] = chars[i].toLowerCase();
    } else {
      chars[i] = chars[i].toUpperCase();
    }
  }

  return chars.join("");
}

export function main(input) {
  input.text = spongeText(input.text);
}

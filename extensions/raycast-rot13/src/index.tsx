import { Clipboard, closeMainWindow } from "@raycast/api";
function rot13(s: string): string {
  return s
    .split("")
    .map((char) => {
      const charCode = char.charCodeAt(0);

      if (charCode >= 65 && charCode <= 90) {
        return String.fromCharCode(((charCode - 65 + 13) % 26) + 65);
      } else if (charCode >= 97 && charCode <= 122) {
        return String.fromCharCode(((charCode - 97 + 13) % 26) + 97);
      } else {
        return char;
      }
    })
    .join("");
}

export default async function main() {
  const clipb = await Clipboard.readText();
  let mycipher = "";
  if (clipb === undefined) {
    mycipher = "";
  } else {
    mycipher = rot13(clipb);
  }
  console.log(mycipher);
  Clipboard.copy(mycipher);
  closeMainWindow();
}

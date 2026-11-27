// Ctrl+letter → control byte (Ctrl-A = 0x01 ... Ctrl-Z = 0x1a).
export function controlByte(letter: string) {
  return String.fromCharCode(letter.charCodeAt(0) - 96);
}

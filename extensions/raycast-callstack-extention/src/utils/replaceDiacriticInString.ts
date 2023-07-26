export default function replaceDiacriticInString(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u0142/g, "l");
}

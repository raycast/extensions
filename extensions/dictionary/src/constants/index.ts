export { default as supportedLanguages } from "./supportedLanguages.d";
export const supportedEngine = {
  googl: "Google Translation",
  urban: "Urban Dictionary",
  // 'linguee': 'Linguee Dictionary(restricted)',
  googlapi: "Google Cloud Translation API",
  youdaoapi: "Youdao API",
};
export const dependenciesEngine = {
  urbandefine: "Urban Dictionary Results",
};
export const knownPos: { [id: string]: string } = {
  n: "noun",
  adj: "adjective",
  v: "verb",
  adv: "adverb",
  perp: "preposition",
  conj: "conjunction",
};

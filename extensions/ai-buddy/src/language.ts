import { getPreferenceValues } from "@raycast/api";

/** The user's own language (Settings → Native Language): Translate goes English ⇄ it; meanings and lessons use it. */
export type Language = {
  id: string;
  /** English name, used in prompts and labels. */
  name: string;
  flag: string;
  /** Text in a script only this language uses here (CJK, Thai, Cyrillic, Devanagari…). */
  script?: RegExp;
  /** Letters English does not use, for Latin-script languages. */
  letters?: RegExp;
  /** Common words, so text typed without accents is still recognized. */
  words?: Set<string>;
};

const words = (list: string) => new Set(list.split(" "));

const ALL: Language[] = [
  {
    id: "vi",
    name: "Vietnamese",
    flag: "🇻🇳",
    letters: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
    // Avoiding ones that are also common English words.
    words: words(
      "ai co ko k khong hok vo vao o tren duoi nhe nha oi anh em chi minh dc duoc roi chua gi sao nao la cua cho voi " +
        "va thi nhung neu khi de lam phai xong di den ve nay kia hom mai sang chieu toi giup nho luon lien het dang se " +
        "da bi cung con ban biet thay muon hoi tra loi gui xem coi nua thoi vay nhi",
    ),
  },
  { id: "zh", name: "Chinese (Simplified)", flag: "🇨🇳", script: /[一-鿿]/ },
  { id: "ja", name: "Japanese", flag: "🇯🇵", script: /[぀-ヿ一-鿿]/ },
  { id: "ko", name: "Korean", flag: "🇰🇷", script: /[가-힯ᄀ-ᇿ]/ },
  { id: "th", name: "Thai", flag: "🇹🇭", script: /[฀-๿]/ },
  {
    id: "id",
    name: "Indonesian",
    flag: "🇮🇩",
    words: words(
      "tolong ini itu yang dan di ke dari untuk dengan ya tidak gak nggak bisa sudah udah belum saya aku kamu kita cek lagi aja dong sih",
    ),
  },
  { id: "hi", name: "Hindi", flag: "🇮🇳", script: /[ऀ-ॿ]/ },
  { id: "ru", name: "Russian", flag: "🇷🇺", script: /[Ѐ-ӿ]/ },
  {
    id: "es",
    name: "Spanish",
    flag: "🇪🇸",
    letters: /[áéíóúñü¿¡]/i,
    words: words(
      "el la los las de que y un una por para con es puedes puede revisar gracias hola pero como esto este esta ya muy",
    ),
  },
  {
    id: "fr",
    name: "French",
    flag: "🇫🇷",
    letters: /[àâçéèêëîïôûùüÿœ]/i,
    words: words(
      "le la les des du de et est un une pour avec pas peux tu vous je il elle sur dans merci bonjour ce cette svp",
    ),
  },
  {
    id: "de",
    name: "German",
    flag: "🇩🇪",
    letters: /[äöüß]/i,
    words: words("der die das und ist nicht ein eine bitte du kannst ich wir mit für auf den dem zu noch schon danke"),
  },
  {
    id: "pt",
    name: "Portuguese",
    flag: "🇧🇷",
    letters: /[ãõçáéíóúâêô]/i,
    words: words("o os de que e em um uma por para com voce pode obrigado ola isso este esta nao favor"),
  },
];

/** A→Z by English name, the same order as in Settings: no language is favored. */
export const LANGUAGES: Language[] = [...ALL].sort((a, b) => a.name.localeCompare(b.name));

/** The language for a Settings value; unknown or missing falls back to the first one (what Settings shows first). */
export const languageOf = (id: string | undefined): Language => LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];

/** Settings → Native Language. */
export const yourLanguage = (): Language => languageOf(getPreferenceValues<Partial<Preferences>>().yourLanguage);

/** Is the text in the user's language (rather than English)? Mixed text with English work terms counts as theirs. */
export function isNative(text: string, lang: Language): boolean {
  if (lang.script) return lang.script.test(text);
  if (lang.letters?.test(text)) return true;
  if (!lang.words) return false;
  const list = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = list.filter((w) => lang.words?.has(w)).length;
  // Need several hits, so an English sentence with a name or two stays English.
  return hits >= 3 || (hits >= 2 && hits / list.length >= 0.25) || (list.length <= 3 && hits / list.length >= 0.5);
}

/** Translate direction: the user's language → English, anything else → the user's language. */
export const translationTarget = (text: string, lang: Language): string =>
  isNative(text, lang) ? "English" : lang.name;

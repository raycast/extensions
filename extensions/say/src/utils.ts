import { getVoices } from "mac-say";

export const getSortedVoices = async () => {
  const orignalVoices = await getVoices();
  return orignalVoices.sort((a, b) => {
    if (a.languageCode === b.languageCode) {
      return a.name.localeCompare(b.name);
    }
    if (a.languageCode === "en_US") return -1;
    if (b.languageCode === "en_US") return 1;
    return a.languageCode.localeCompare(b.languageCode);
  });
};

export const languageCodeToEmojiFlag = (languageCode: string) => {
  if (languageCode === "en-scotland") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  const codePoints = languageCode
    .slice(-2)
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

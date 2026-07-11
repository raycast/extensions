import { get } from "./request";
import { googleTranslationSchema } from "./googleTranslationSchema";
import { createTranslationKey, getTranslatedSentence, getTranslitSentence } from "./utils";
export const translate = async (from, to, text, context) => {
  try {
    const key = createTranslationKey(`${from}-${to}`, text);
    const res = await get(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&dt=bd&dt=rm&dj=1&source=input&q=${encodeURIComponent(text)}`,
    );
    const parsedResponse = googleTranslationSchema.safeParse(res);
    if (!parsedResponse.success) {
      throw new Error(`Invalid response - ${parsedResponse.error.message}`);
    }
    return {
      translation: parsedResponse.data,
      context: context || text,
      text,
      timestamp: new Date().getTime(),
      fromTo: `${from}-${to}`,
      hashKey: key,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};
export { googleTranslationSchema, createTranslationKey, getTranslatedSentence, getTranslitSentence };

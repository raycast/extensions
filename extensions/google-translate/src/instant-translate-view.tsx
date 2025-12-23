import { baseInstantTranslate, showExtendedHUD } from "./instant-translate";

export default async function InstantTranslateView() {
  await baseInstantTranslate(async (translatedText) => {
    await showExtendedHUD(translatedText);
  });
}

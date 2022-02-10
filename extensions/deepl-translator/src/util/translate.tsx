import { Detail, render, getSelectedText, getPreferenceValues } from '@raycast/api';
import translate from 'deepl';
import { DeeplLanguages } from 'deepl';

const preferences = getPreferenceValues();
export const translateByDeepl = async (targetLang: DeeplLanguages) => {
  const deeplApiKey = preferences.deeplApiKey as string | undefined;
  let resultTsx = <Detail markdown="# Failed Translate" />;

  const selectedText = await getSelectedText().catch(error => {
    console.error(111, error);
  });

  if (!!deeplApiKey && !!selectedText && selectedText.length > 0) {
    const translatedResult = await translate({
      free_api: !preferences.isPro,
      text: selectedText,
      target_lang: targetLang,
      auth_key: deeplApiKey,
    });
    if (translatedResult.status === 200) {
      const formattedMarkdown =
        '# ' + translatedResult.data.translations[0].text;
      resultTsx = <Detail markdown={formattedMarkdown} />;
    } else {
      resultTsx = <Detail markdown="# Failed DeepL Translate" />;
    }
  }
  render(resultTsx); // rerender
};

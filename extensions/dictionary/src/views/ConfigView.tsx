import { Form } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { supportedEngine } from "../constants";
import { getLanguages } from "../hooks";
import { LanguageCode } from "../types";
import { EngineID } from "../engines";

const ConfigView = () => {
  const [selectedEngine = "googl", setSelectedEngine] = useCachedState<EngineID | undefined>("engine");
  const [selectedPrimeLang = "en", setPrimeLang] = useCachedState<LanguageCode | undefined>("primary_language");
  const [selectedFallbackLang = "", setFallbackLang] = useCachedState<LanguageCode | undefined>("fallback_language");
  const languages = getLanguages();
  const languagesList = Object.values(languages);
  return (
    <Form>
      <Form.Dropdown
        id="engines"
        title="Selected Engine"
        value={selectedEngine}
        onChange={(engineId: string) => setSelectedEngine((engineId as EngineID) || "googl")}
      >
        <Form.Dropdown.Item value="" title="Please select..." />
        {Object.entries(supportedEngine).map(([key, title]) => (
          <Form.Dropdown.Item key={key} value={key} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown
        id="primary-language"
        title="Default Language"
        onChange={(lang: string) => setPrimeLang((lang as LanguageCode) || "en")}
        value={selectedPrimeLang}
      >
        <Form.Dropdown.Item value="" title="Please select..." />
        {languagesList.map((lang) => (
          <Form.Dropdown.Item value={lang.key} keywords={[lang.key]} {...lang} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="fallback-language"
        title="Fallback Language"
        onChange={(lang: string) => {
          lang && setFallbackLang(lang as LanguageCode);
        }}
        value={selectedFallbackLang}
      >
        <Form.Dropdown.Item value="" title="Please select..." />
        {languagesList
          .filter((lang) => lang.key !== selectedPrimeLang)
          .map((lang) => (
            <Form.Dropdown.Item value={lang.key} keywords={[lang.key]} {...lang} />
          ))}
      </Form.Dropdown>
    </Form>
  );
};
export default ConfigView;

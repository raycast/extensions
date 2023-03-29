import { Form } from "@raycast/api";
import { supportedEngine } from "../constants";
import { getLanguages, useStatedCache } from "../hooks";

const ConfigView = () => {
  const [selectedEngine, setSelectedEngine] = useStatedCache<string>("engine");
  const [selectedPrimeLang, setPrimeLang] = useStatedCache<string>("primary_language");
  const [selectedFallbackLang, setFallbackLang] = useStatedCache<string>("fallback_language");
  const languages = getLanguages();
  const languagesList = Object.values(languages);
  console.debug("reload ConfigView");
  return (
    <Form>
      <Form.Dropdown id="engines" title="Selected Engine" value={selectedEngine} onChange={setSelectedEngine}>
        <Form.Dropdown.Item value="" title="Please select..." />
        {Object.entries(supportedEngine).map(([key, title]) => (
          <Form.Dropdown.Item key={key} value={key} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown id="primary-language" title="Default Language" onChange={setPrimeLang} value={selectedPrimeLang}>
        <Form.Dropdown.Item value="" title="Please select..." />
        {languagesList.map((lang) => (
          <Form.Dropdown.Item value={lang.key} keywords={[lang.key]} {...lang} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="fallback-language"
        title="Fallback Language"
        onChange={setFallbackLang}
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

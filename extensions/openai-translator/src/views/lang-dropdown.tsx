import { List } from "@raycast/api";
import { supportLanguages } from "../providers/lang";
import { HistoryHook } from "../hooks/useHistory";

export function LangDropdown(props: {
  type: string;
  selectedStandardLang: string;
  history: HistoryHook;
  onLangChange: (newStandardLang: string) => void;
}) {
  const { type, selectedStandardLang, onLangChange } = props;

  const items = type == "To" ? supportLanguages : [["auto", "Auto"], ...supportLanguages];

  const getRecentTranslations = () => {
    const recentTranslationLangsSet = new Set(props.history.data?.map((item) => item.result.to));
    return [...recentTranslationLangsSet].slice(0, 3);
  };

  const recentTranslationsLangs = getRecentTranslations();

  return (
    <List.Dropdown
      tooltip="Select Target Language"
      //storeValue={true}
      defaultValue={selectedStandardLang}
      onChange={(newValue) => {
        onLangChange(newValue);
      }}
    >
      {recentTranslationsLangs.length > 0 && (
        <List.Dropdown.Section title="Recent Translate">
          {recentTranslationsLangs.map((recentStandardLang) => {
            const foundItem = items.find(([standardLang]) => standardLang === recentStandardLang);
            if (!foundItem) return null;

            const [, lang] = foundItem;
            return <List.Dropdown.Item key={recentStandardLang} title={`${type} ${lang}`} value={recentStandardLang} />;
          })}
        </List.Dropdown.Section>
      )}
      <List.Dropdown.Section title={`Translate ${type}`}>
        {items.map(
          ([standardLang, lang]) =>
            !recentTranslationsLangs.includes(standardLang) && (
              <List.Dropdown.Item key={standardLang} title={`${type} ${lang}`} value={standardLang} />
            ),
        )}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

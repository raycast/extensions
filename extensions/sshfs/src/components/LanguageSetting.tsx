import { List, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";

export function LanguageSetting({
  language,
  setLanguage,
}: {
  language: string;
  setLanguage: (language: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const handleLanguageChange = async (language: string) => {
    await setLanguage(language);
    await showToast({
      title: language === "ko" ? "언어 변경" : "Language changed",
      message: language === "ko" ? "한국어로 변경되었습니다" : "Language changed to English",
    });
    pop();
  };

  return (
    <List searchBarPlaceholder={language === "ko" ? "언어 설정..." : "Language setting..."}>
      <List.Item
        key={0}
        title={language === "ko" ? "✅ 한국어" : "한국어"}
        icon="🇰🇷"
        accessories={[{ text: "한국어" }]}
        actions={
          <ActionPanel>
            <Action
              title={language === "ko" ? "언어 변경" : "Change language"}
              icon="⏏️"
              style={Action.Style.Regular}
              onAction={() => handleLanguageChange("ko")}
            />
          </ActionPanel>
        }
      />
      <List.Item
        key={1}
        title={language === "en" ? "✅ English" : "English"}
        icon="🇺🇸"
        accessories={[{ text: "English" }]}
        actions={
          <ActionPanel>
            <Action
              title={language === "ko" ? "언어 변경" : "Change language"}
              icon="⏏️"
              style={Action.Style.Regular}
              onAction={() => handleLanguageChange("en")}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

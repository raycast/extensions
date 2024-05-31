import { Action, ActionPanel } from "@raycast/api";

import { languages, useLanguage } from "../utils/language";

import { useAvalableLanguages } from "@/hooks/usePageData";

export function ChangeLanguageSubmenu({ title }: { title: string }) {
  const [language, setLanguage] = useLanguage();
  const { data: availableLanguages, isLoading } = useAvalableLanguages(title, language);

  return (
    <ActionPanel.Submenu
      shortcut={{ modifiers: ["cmd"], key: "p" }}
      title="Change Language"
      icon={languages.find((l) => l.value === language)?.icon}
      isLoading={isLoading}
    >
      {languages
        .filter(({ value }) => value !== language)
        .filter(({ value }) => availableLanguages?.includes(value))
        .map((language) => (
          <Action
            key={language.value}
            icon={language.icon}
            title={language.title}
            onAction={() => setLanguage(language.value)}
          />
        ))}
    </ActionPanel.Submenu>
  );
}

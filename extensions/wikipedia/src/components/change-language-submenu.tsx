import { Action, ActionPanel } from "@raycast/api";

import { languages, Locale } from "../utils/language";

import { useAvailableLanguages } from "@/hooks/usePageData";

export function ChangeLanguageSubmenu({
  title,
  language,
  onSelect,
}: {
  title: string;
  language: string;
  onSelect: (title: string, language: Locale) => void;
}) {
  const { data: availableLanguages, isLoading } = useAvailableLanguages(title, language);

  return (
    <ActionPanel.Submenu
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "l" },
        Windows: { modifiers: ["ctrl", "shift"], key: "l" },
      }}
      title="Change Language"
      icon={languages.find((l) => l.value === language)?.icon}
      isLoading={isLoading}
    >
      {languages
        .filter(({ value }) => value !== language)
        .map(({ value, icon, title }) => {
          const translatedTitle = availableLanguages?.find(({ lang }) => lang === value)?.title;
          if (!translatedTitle) {
            return null;
          }

          return <Action key={value} icon={icon} title={title} onAction={() => onSelect(translatedTitle, value)} />;
        })}
    </ActionPanel.Submenu>
  );
}

import { Action, ActionPanel, List, Icon, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";

const formatLanguageName = (filename: string) => {
  return filename
    .replace(".json", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export function LanguageSelector({
  currentLanguage,
  onSelect,
}: {
  currentLanguage: string;
  onSelect: (lang: string) => void;
}) {
  const { pop } = useNavigation();
  const { data, isLoading } = useFetch<
    { name: string; download_url: string; type: string }[]
  >(
    "https://api.github.com/repos/monkeytypegame/monkeytype/contents/frontend/static/languages",
  );
  const languages = useMemo(() => {
    if (!data) return [];
    return data
      .filter(
        (file) =>
          file.type === "file" &&
          file.name.endsWith(".json") &&
          !file.name.startsWith("_"),
      )
      .map((file) => ({
        id: file.name.replace(".json", ""),
        name: formatLanguageName(file.name),
      }));
  }, [data]);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search languages...">
      {languages.map((lang) => (
        <List.Item
          key={lang.id}
          title={lang.name}
          icon={lang.id === currentLanguage ? Icon.CheckCircle : Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Select Language"
                onAction={() => {
                  onSelect(lang.id);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

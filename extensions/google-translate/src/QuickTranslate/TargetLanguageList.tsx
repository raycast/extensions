import { Action, ActionPanel, Icon, List, clearSearchBar } from "@raycast/api";
import React from "react";
import { useTargetLanguages } from "../hooks";
import { languages, supportedLanguagesByCode } from "../languages";
import { AUTO_DETECT } from "../simple-translate";

export const TargetLanguageList: React.VFC = () => {
  const [targetLanguages, setTargetLanguages] = useTargetLanguages();

  return (
    <List searchBarPlaceholder="Search languages">
      <List.Section title="Selected Languages" subtitle={`${targetLanguages.length}`}>
        {targetLanguages.map((lang) => (
          <List.Item
            key={lang}
            title={supportedLanguagesByCode[lang].name}
            subtitle={lang}
            actions={
              targetLanguages.length === 1 && targetLanguages[0] === "en" ? undefined : (
                <ActionPanel>
                  <Action
                    title="Remove"
                    icon={Icon.Minus}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => {
                      const updated = targetLanguages.filter((l) => l != lang);
                      setTargetLanguages(updated.length === 0 ? ["en"] : updated);
                      clearSearchBar();
                    }}
                  />
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
                    onAction={() => {
                      const index = targetLanguages.indexOf(lang);
                      if (index > 0) {
                        const updated = [...targetLanguages];
                        updated.splice(index - 1, 0, updated.splice(index, 1)[0]);
                        setTargetLanguages(updated);
                      }
                    }}
                  />
                  <Action
                    title="Move down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
                    onAction={() => {
                      const index = targetLanguages.indexOf(lang);
                      if (index < targetLanguages.length - 1) {
                        const updated = [...targetLanguages];
                        updated.splice(index + 1, 0, updated.splice(index, 1)[0]);
                        setTargetLanguages(updated);
                      }
                    }}
                  />
                </ActionPanel>
              )
            }
          />
        ))}
      </List.Section>
      <List.Section title="Available Languages">
        {languages
          .filter((lang) => lang.code != AUTO_DETECT && !targetLanguages.includes(lang.code))
          .map((lang) => (
            <List.Item
              key={lang.code}
              title={lang.name}
              subtitle={lang.code}
              actions={
                <ActionPanel>
                  <Action
                    title="Add"
                    icon={Icon.Plus}
                    onAction={() => {
                      setTargetLanguages((prev) => [...prev, lang.code]);
                      clearSearchBar();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
};

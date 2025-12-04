import { ActionPanel } from "@raycast/api";

import { Language } from "@models";

import { Filter } from "@types";

import { languageURL } from "@urls";

type Props = {
  language: Language;
  onFilter: (filter: Filter) => void;
};

export function LanguageActionItem({ language, onFilter }: Props): JSX.Element {
  return (
    <ActionPanel.Item
      title={language.displayName}
      icon={languageURL(language.name)}
      onAction={() => onFilter(language.name)}
    />
  );
}

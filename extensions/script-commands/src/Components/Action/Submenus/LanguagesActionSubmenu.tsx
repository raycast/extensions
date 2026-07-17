import { ActionPanel } from "@raycast/api";

import { LanguageActionItem } from "@components";

import { IconConstants, ShortcutConstants } from "Const";

import { Language } from "@models";

import { Filter } from "@types";

type Props = {
  languages: Language[];
  onFilter: (filter: Filter) => void;
};

export function LanguagesActionSubmenu({ languages, onFilter }: Props): JSX.Element {
  return (
    <ActionPanel.Submenu
      title="Languages"
      icon={IconConstants.Languages}
      shortcut={ShortcutConstants.Languages}
      children={languages.map((language) => (
        <LanguageActionItem key={language.name} language={language} onFilter={onFilter} />
      ))}
    />
  );
}
